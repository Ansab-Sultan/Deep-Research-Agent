from __future__ import annotations

from pydantic import BaseModel, Field


class FollowUpRequest(BaseModel):
    question: str = Field(min_length=3)


class FollowUpResponse(BaseModel):
    answer: str
    cited_chunk_ids: list[str]


class ChunkDocument(BaseModel):
    job_id: str
    chunk_id: str
    heading: str
    text: str
    char_start: int
    char_end: int
