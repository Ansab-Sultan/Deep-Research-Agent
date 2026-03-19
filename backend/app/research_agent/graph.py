from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from langgraph.graph import END, StateGraph

from app.core.config import DepthName, Settings
from app.core.llm_config import LLMGateway
from app.research_agent.nodes.critic import critic_node
from app.research_agent.nodes.planner import planner_node
from app.research_agent.nodes.researcher import researcher_node
from app.research_agent.nodes.summarizer import summarizer_node
from app.research_agent.nodes.writer import assemble_report, polish_node, section_writer_node, writer_planner_node
from app.research_agent.state import ResearchState

ProgressCallback = Callable[[str, str], Awaitable[None] | None]


class ResearchGraph:
    def __init__(self, settings: Settings, llm: LLMGateway) -> None:
        self._settings = settings
        self._llm = llm
        self._graph_cache: dict[DepthName, Any] = {}

    async def run(self, topic: str, depth: DepthName, on_progress: ProgressCallback | None = None) -> ResearchState:
        state: ResearchState = {
            "topic": topic,
            "depth": depth,
            "sub_questions": [],
            "search_results": [],
            "summaries": [],
            "is_sufficient": False,
            "gaps": None,
            "iteration_count": 0,
            "report_outline": [],
            "current_section_index": 0,
            "section_drafts": [],
            "report_draft": None,
            "final_report": None,
            "sources": [],
            "progress": [],
        }
        profile = self._settings.depth_profile(depth)
        graph = self._graph_cache.get(depth)
        if graph is None:
            graph = self._build_graph(depth)
            self._graph_cache[depth] = graph

        async for update in graph.astream(state, stream_mode="updates"):
            node_name = next(iter(update.keys()))
            node_output = update[node_name]
            await self._apply_node(node_name, state, node_output, on_progress)

        return state

    def _build_graph(self, depth: DepthName):
        profile = self._settings.depth_profile(depth)
        tavily_api_key = self._settings.tavily_api_key

        def planner(state: ResearchState) -> dict:
            return planner_node(state, self._llm)

        def researcher(state: ResearchState) -> dict:
            return researcher_node(state, profile, self._llm, tavily_api_key)

        def summarizer(state: ResearchState) -> dict:
            return summarizer_node(state, self._llm)

        def critic(state: ResearchState) -> dict:
            return critic_node(state, profile, self._llm)

        def writer_planner(state: ResearchState) -> dict:
            return writer_planner_node(state, profile, self._llm)

        def section_writer(state: ResearchState) -> dict:
            return section_writer_node(state, self._llm)

        def writer_assembler(state: ResearchState) -> dict:
            draft = assemble_report(state["topic"], state["section_drafts"], state["sources"])
            return {
                "report_draft": draft,
                "progress": state["progress"] + ["✓ Assembling full draft"],
            }

        def polish(state: ResearchState) -> dict:
            return polish_node(state, self._llm, self._settings)

        def should_continue_research(state: ResearchState) -> str:
            if state["is_sufficient"] or state["iteration_count"] >= profile.max_iterations:
                return "write"
            return "research_more"

        def should_continue_sections(state: ResearchState) -> str:
            if state["current_section_index"] >= len(state["report_outline"]):
                return "assemble"
            return "next_section"

        builder = StateGraph(ResearchState)
        builder.add_node("planner", planner)
        builder.add_node("researcher", researcher)
        builder.add_node("summarizer", summarizer)
        builder.add_node("critic", critic)
        builder.add_node("writer_planner", writer_planner)
        builder.add_node("section_writer", section_writer)
        builder.add_node("writer_assembler", writer_assembler)
        builder.add_node("polish", polish)

        builder.set_entry_point("planner")
        builder.add_edge("planner", "researcher")
        builder.add_edge("researcher", "summarizer")
        builder.add_edge("summarizer", "critic")
        builder.add_conditional_edges(
            "critic",
            should_continue_research,
            {"write": "writer_planner", "research_more": "researcher"},
        )
        builder.add_edge("writer_planner", "section_writer")
        builder.add_conditional_edges(
            "section_writer",
            should_continue_sections,
            {"next_section": "section_writer", "assemble": "writer_assembler"},
        )
        builder.add_edge("writer_assembler", "polish")
        builder.add_edge("polish", END)
        return builder.compile()

    async def _apply_node(
        self,
        node_name: str,
        state: ResearchState,
        updates: dict[str, Any],
        on_progress: ProgressCallback | None,
    ) -> None:
        for key, value in updates.items():
            state[key] = value

        latest = state["progress"][-1] if state["progress"] else f"✓ {node_name} complete"
        await self._emit_progress(node_name, latest, on_progress)

    async def _emit_progress(self, node_name: str, progress: str, on_progress: ProgressCallback | None) -> None:
        if on_progress is None:
            return
        maybe = on_progress(node_name, progress)
        if hasattr(maybe, "__await__"):
            await maybe
