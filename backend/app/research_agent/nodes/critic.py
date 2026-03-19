from __future__ import annotations

from app.core.config import DepthProfile
from app.core.llm_config import LLMGateway
from app.research_agent.models import CriticOutput
from app.research_agent.state import ResearchState


def critic_node(state: ResearchState, profile: DepthProfile, llm: LLMGateway) -> dict:
    next_iteration = state["iteration_count"] + 1

    def fallback() -> CriticOutput:
        is_done = next_iteration >= profile.max_iterations
        gap_text = None if is_done else f"Missing deeper coverage for {state['topic']}"
        return CriticOutput(is_sufficient=is_done, gaps=gap_text)

    prompt = (
        f"Topic: {state['topic']}\n"
        f"Current summary count: {len(state['summaries'])}\n"
        f"Current iteration: {next_iteration}/{profile.max_iterations}\n"
        "Decide if coverage is sufficient; if not, provide one focused research gap."
    )
    result = llm.structured_invoke(CriticOutput, prompt, fallback)

    progress_msg = "✓ Coverage evaluated"
    return {
        "is_sufficient": result.is_sufficient or next_iteration >= profile.max_iterations,
        "gaps": result.gaps,
        "iteration_count": next_iteration,
        "progress": state["progress"] + [progress_msg],
    }
