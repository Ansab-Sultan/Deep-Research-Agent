import pytest

from app.core.config import Settings
from app.core.llm_config import LLMGateway
from app.research_agent.graph import ResearchGraph


@pytest.mark.asyncio
async def test_graph_generates_section_drafts_and_polished_report() -> None:
    settings = Settings(
        gemini_api_key="",
        tavily_api_key="",
        depth_quick_iterations=1,
        depth_quick_target_sections=4,
        depth_quick_query_fanout=2,
    )
    llm = LLMGateway(settings)
    graph = ResearchGraph(settings, llm)

    state = await graph.run(topic="AI maintenance triage", depth="quick")

    assert state["iteration_count"] == 1
    assert len(state["report_outline"]) == 4
    assert len(state["section_drafts"]) == 4
    assert state["report_draft"]
    assert state["final_report"]
    assert any("Writing section 1/4" in msg for msg in state["progress"])
    assert "## Sources" in state["final_report"]
    assert state["final_report"].startswith("# AI maintenance triage")
    assert "## Section 1:" in state["final_report"]
    assert "\n## Section 1:" in state["final_report"]
    assert "\n### Key Points\n" in state["final_report"]
    assert "\n## Section 1:" in state["final_report"]
    assert "## Section 1:\n\n## Section 1:" not in state["final_report"]
