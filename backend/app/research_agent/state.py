from __future__ import annotations

from typing import TypedDict

from app.core.config import DepthName


class SectionDraft(TypedDict):
    heading: str
    content: str


class SearchResult(TypedDict):
    query: str
    content: str
    url: str


class ResearchState(TypedDict):
    topic: str
    depth: DepthName
    sub_questions: list[str]
    search_results: list[SearchResult]
    summaries: list[str]
    is_sufficient: bool
    gaps: str | None
    iteration_count: int
    report_outline: list[str]
    current_section_index: int
    section_drafts: list[SectionDraft]
    report_draft: str | None
    final_report: str | None
    sources: list[str]
    progress: list[str]
