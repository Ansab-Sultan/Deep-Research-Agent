from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class FollowUpRecord(BaseModel):
    question: str
    answer: str
    cited_chunk_ids: list[str]
    asked_at: str


class HistoryListItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="_id")
    title: str
    depth: str
    created_at: str


class ReportDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="_id")
    title: str
    report_markdown: str
    sources: list[str]
    depth: str
    created_at: str
    chunks: list[dict]
    followups: list[FollowUpRecord]
