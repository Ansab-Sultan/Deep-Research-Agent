from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ProgressEvent(BaseModel):
    node: str
    progress: str
    ts: str


class CompleteEvent(BaseModel):
    job_id: str
    report_id: str


class ErrorEvent(BaseModel):
    job_id: str
    code: str
    message: str
