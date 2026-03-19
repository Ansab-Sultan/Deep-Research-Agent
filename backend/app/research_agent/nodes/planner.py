from __future__ import annotations

from app.core.llm_config import LLMGateway
from app.research_agent.models import PlannerOutput
from app.research_agent.state import ResearchState


def planner_node(state: ResearchState, llm: LLMGateway) -> dict:
    topic = state["topic"].strip()

    def fallback() -> PlannerOutput:
        base = [
            f"What is the current state of {topic}?",
            f"What are the key trends and drivers in {topic}?",
            f"What are the main challenges and limitations in {topic}?",
            f"What are notable real-world examples of {topic}?",
            f"What are likely future directions for {topic}?",
        ]
        return PlannerOutput(sub_questions=base)

    prompt = (
        "Generate 4-6 focused research sub-questions. "
        f"Topic: {topic}. Return only concise, non-overlapping questions."
    )
    result = llm.structured_invoke(PlannerOutput, prompt, fallback)

    progress_msg = "✓ Research plan created"
    return {
        "sub_questions": result.sub_questions,
        "progress": state["progress"] + [progress_msg],
    }
