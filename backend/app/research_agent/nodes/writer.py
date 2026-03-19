from __future__ import annotations

import re

from app.core.config import DepthProfile, Settings
from app.core.llm_config import LLMGateway
from app.research_agent.models import PolishOutput, SectionOutput, WriterOutlineOutput
from app.research_agent.state import ResearchState


def _normalize_section_heading(heading: str, fallback_title: str) -> str:
    cleaned = (heading or "").strip()
    if not cleaned:
        cleaned = fallback_title
    cleaned = re.sub(r"^#+\s*", "", cleaned).strip()
    return f"## {cleaned}"


def _strip_leading_heading(content: str) -> str:
    text = (content or "").strip()
    lines = text.splitlines()
    while lines and re.match(r"^\s*#+\s+", lines[0]):
        lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)
    return "\n".join(lines).strip()


def writer_planner_node(state: ResearchState, profile: DepthProfile, llm: LLMGateway) -> dict:
    topic = state["topic"]

    def fallback() -> WriterOutlineOutput:
        sections = []
        for i in range(profile.target_sections):
            sections.append(f"Section {i + 1}: {topic} - Angle {i + 1}")
        return WriterOutlineOutput(sections=sections)

    prompt = (
        f"Create exactly {profile.target_sections} section headings for a professional research report about: {topic}. "
        "The headings must cover the topic logically from overview to implementation details, tradeoffs, and conclusion. "
        "Return concise section titles only, without bullets or numbering. "
        "Do not include markdown syntax in the titles. "
        "IMPORTANT: Do not use 'Executive Summary' as a heading."
    )
    result = llm.structured_invoke(WriterOutlineOutput, prompt, fallback)
    normalized_sections = [
        _normalize_section_heading(section, f"Section {idx + 1}")
        for idx, section in enumerate(result.sections[: profile.target_sections])
    ]
    while len(normalized_sections) < profile.target_sections:
        normalized_sections.append(f"## Section {len(normalized_sections) + 1}")

    progress_msg = f"✓ Writing plan created ({len(normalized_sections)} sections)"
    return {
        "report_outline": normalized_sections,
        "current_section_index": 0,
        "progress": state["progress"] + [progress_msg],
    }


def section_writer_node(state: ResearchState, llm: LLMGateway) -> dict:
    idx = state["current_section_index"]
    outline = state["report_outline"]
    heading = outline[idx]

    supporting = state["summaries"][idx:: max(1, len(outline))]
    source_sample = state["sources"][:3]

    fallback_content = "\n".join(
        [
            "This section synthesizes accumulated research findings and focuses on practical insights.",
            "",
            "### Key Points",
            f"- {supporting[0] if supporting else 'No additional summary available.'}",
            f"- Source anchors: {', '.join(source_sample) if source_sample else 'N/A'}",
        ]
    )

    def fallback() -> SectionOutput:
        return SectionOutput(heading=heading, content=fallback_content)

    prompt = (
        f"Write the body of a professional markdown report section for heading: {heading}. "
        f"Use these supporting summaries: {supporting[:4]}. "
        "Requirements: write polished report prose, use short paragraphs, add markdown bullet points only where they improve clarity, "
        "and add `###` subheadings if the section benefits from internal structure. "
        "Do not repeat the main section heading in the body. "
        "Maintain a factual tone and include concise source anchoring."
    )
    result = llm.structured_invoke(SectionOutput, prompt, fallback)

    draft = {
        "heading": _normalize_section_heading(result.heading or heading, heading),
        "content": _strip_leading_heading(result.content) or fallback_content,
    }
    total = len(outline)
    progress_msg = f"✓ Writing section {idx + 1}/{total}"
    return {
        "section_drafts": state["section_drafts"] + [draft],
        "current_section_index": idx + 1,
        "progress": state["progress"] + [progress_msg],
    }


def assemble_report(topic: str, sections: list[dict], sources: list[str]) -> str:
    body_parts = [f"# {topic}"]
    for section in sections:
        body_parts.append("")
        body_parts.append(section["heading"])
        body_parts.append("")
        body_parts.append(section["content"])

    body_parts.extend(["", "## Sources", ""])
    for src in sources:
        body_parts.append(f"- {src}")
    return "\n".join(body_parts).strip() + "\n"


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def polish_node(state: ResearchState, llm: LLMGateway, settings: Settings) -> dict:
    draft = state["report_draft"] or ""

    def fallback() -> PolishOutput:
        return PolishOutput(polished_markdown=draft)

    prompt = (
        "Polish this markdown report for clarity and formatting only. "
        "Preserve the report structure, keep headings professional, keep bullet lists where they help readability, "
        "and ensure the output reads like a proper research report. "
        "Do not delete substantive content or citations.\n\n"
        f"Report:\n{draft}"
    )
    result = llm.structured_invoke(PolishOutput, prompt, fallback)
    polished = result.polished_markdown.strip() + "\n"

    draft_words = max(1, _word_count(draft))
    polished_words = _word_count(polished)
    min_words = int(draft_words * settings.polish_min_ratio)

    if polished_words < min_words:
        polished = draft

    progress_msg = f"✓ Polishing clarity (length retention >={int(settings.polish_min_ratio * 100)}%)"
    return {
        "final_report": polished,
        "progress": state["progress"] + [progress_msg],
    }
