from app.core.config import Settings
from app.research_agent.models import PolishOutput
from app.research_agent.nodes.writer import polish_node


class ShrinkingLLM:
    def structured_invoke(self, schema, prompt, fallback_factory):
        if schema is PolishOutput:
            return PolishOutput(polished_markdown="too short")
        return fallback_factory()


def test_polish_guard_rejects_shrinking_output() -> None:
    settings = Settings(polish_min_ratio=0.95)
    draft = "word " * 300
    state = {
        "report_draft": draft,
        "progress": [],
    }

    result = polish_node(state, ShrinkingLLM(), settings)
    assert result["final_report"] == draft
    assert "Polishing clarity" in result["progress"][-1]
