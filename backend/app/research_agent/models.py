from __future__ import annotations

from pydantic import BaseModel, Field


class PlannerOutput(BaseModel):
    sub_questions: list[str] = Field(default_factory=list)


class CriticOutput(BaseModel):
    is_sufficient: bool
    gaps: str | None = None


class WriterOutlineOutput(BaseModel):
    sections: list[str] = Field(default_factory=list)


class SectionOutput(BaseModel):
    heading: str
    content: str


class PolishOutput(BaseModel):
    polished_markdown: str


class FollowUpOutput(BaseModel):
    answer: str
    cited_chunk_ids: list[str]
