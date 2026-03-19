from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

JobStatusLiteral = Literal["queued", "running", "complete", "failed"]
DepthLiteral = Literal["quick", "standard", "deep"]


class ResearchRequest(BaseModel):
    topic: str = Field(min_length=3)
    depth: DepthLiteral = "standard"


class ResearchResponse(BaseModel):
    job_id: str
    status: JobStatusLiteral


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatusLiteral
    report_id: str | None = None
    error: str | None = None


class JobListItem(BaseModel):
    job_id: str
    status: JobStatusLiteral
    title: str | None = None
    depth: str | None = None
    created_at: str | None = None
    report_id: str | None = None
    error: str | None = None
    has_persisted_report: bool = False


class JobDetailResponse(JobListItem):
    pass


class DeleteJobResponse(BaseModel):
    job_id: str
    deleted: bool


class HealthResponse(BaseModel):
    status: str
    services: dict[str, dict[str, str]]
    llm: dict[str, str]
    embedding: dict[str, str]
