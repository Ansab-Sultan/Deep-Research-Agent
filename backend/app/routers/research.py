from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import StreamingResponse

from app.schemas.followup import FollowUpRequest, FollowUpResponse
from app.schemas.research import (
    DeleteJobResponse,
    JobDetailResponse,
    JobListItem,
    JobStatusResponse,
    ResearchRequest,
    ResearchResponse,
)

router = APIRouter(tags=["research"])


@router.post("/research", response_model=ResearchResponse)
async def submit_research(
    payload: ResearchRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> ResearchResponse:
    service = request.app.state.research_service
    result = await service.submit_research(payload.topic, payload.depth, background_tasks)
    return ResearchResponse(**result)


@router.get("/research/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, request: Request) -> JobStatusResponse:
    service = request.app.state.research_service
    result = await service.get_job_status(job_id)
    return JobStatusResponse(**result)


@router.get("/research/{job_id}/stream")
async def stream_research(job_id: str, request: Request) -> StreamingResponse:
    service = request.app.state.research_service
    stream = service.stream_research(job_id)
    return StreamingResponse(stream, media_type="text/event-stream")


@router.post("/research/{job_id}/followup", response_model=FollowUpResponse)
async def ask_followup(job_id: str, payload: FollowUpRequest, request: Request) -> FollowUpResponse:
    service = request.app.state.followup_service
    result = await service.answer(job_id, payload.question)
    return FollowUpResponse(**result)


@router.get("/research/{job_id}/chunks")
async def get_chunks(job_id: str, request: Request) -> list[dict]:
    service = request.app.state.followup_service
    return await service.get_chunks(job_id)


@router.get("/research/{job_id}/chunks/{chunk_id}")
async def get_chunk(job_id: str, chunk_id: str, request: Request) -> dict:
    service = request.app.state.followup_service
    return await service.get_chunk(job_id, chunk_id)


@router.get("/jobs", response_model=list[JobListItem])
async def list_jobs(request: Request) -> list[JobListItem]:
    service = request.app.state.research_service
    rows = await service.list_jobs()
    return [JobListItem(**row) for row in rows]


@router.get("/jobs/{job_id}", response_model=JobDetailResponse)
async def get_job_detail(job_id: str, request: Request) -> JobDetailResponse:
    service = request.app.state.research_service
    row = await service.get_job_detail(job_id)
    return JobDetailResponse(**row)


@router.delete("/jobs/{job_id}", response_model=DeleteJobResponse)
async def delete_job(job_id: str, request: Request) -> DeleteJobResponse:
    service = request.app.state.research_service
    result = await service.delete_job(job_id)
    return DeleteJobResponse(**result)
