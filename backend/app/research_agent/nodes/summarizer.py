from __future__ import annotations

from app.core.llm_config import LLMGateway
from app.research_agent.state import ResearchState


def summarizer_node(state: ResearchState, _llm: LLMGateway) -> dict:
    seen_count = len(state["summaries"])
    new_rows = state["search_results"][seen_count:]

    new_summaries: list[str] = []
    for row in new_rows:
        content = row["content"].strip()
        query = row["query"].strip()
        clipped = content[:320]
        summary = f"Query: {query}\n- {clipped}"
        new_summaries.append(summary)

    progress_msg = f"✓ Summarized {len(new_summaries)} findings"
    return {
        "summaries": state["summaries"] + new_summaries,
        "progress": state["progress"] + [progress_msg],
    }
