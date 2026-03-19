from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.history import HistoryListItem, ReportDetail

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryListItem])
async def get_history(request: Request) -> list[HistoryListItem]:
    service = request.app.state.history_service
    rows = await service.get_history()
    return [HistoryListItem.model_validate(row) for row in rows]


@router.get("/history/{job_id}", response_model=ReportDetail)
async def get_history_detail(job_id: str, request: Request) -> ReportDetail:
    service = request.app.state.history_service
    detail = await service.get_report_detail(job_id)
    return ReportDetail.model_validate(detail)
