from __future__ import annotations

from app.core.errors import NotFoundError
from app.services.history_service import HistoryService
from app.services.rag_service import RAGService


class FollowUpService:
    def __init__(self, history_service: HistoryService, rag_service: RAGService) -> None:
        self._history = history_service
        self._rag = rag_service

    async def answer(self, job_id: str, question: str) -> dict:
        if not await self._history.report_exists(job_id):
            raise NotFoundError("REPORT_NOT_FOUND", f"Report {job_id} was not found")

        response = await self._rag.answer_followup(job_id, question)
        await self._history.save_followup(
            job_id=job_id,
            question=question,
            answer=response.answer,
            cited_chunk_ids=response.cited_chunk_ids,
        )
        return response.model_dump()

    async def get_chunks(self, job_id: str) -> list[dict]:
        report = await self._history.get_report_detail(job_id)
        metadata = report.get("chunks", [])
        return await self._rag.get_chunks(job_id=job_id, chunk_hints=metadata)

    async def get_chunk(self, job_id: str, chunk_id: str) -> dict:
        report = await self._history.get_report_detail(job_id)
        metadata = report.get("chunks", [])
        chunk = await self._rag.get_chunk(job_id=job_id, chunk_id=chunk_id, chunk_hints=metadata)
        if chunk is None:
            raise NotFoundError("CHUNK_NOT_FOUND", f"Chunk {chunk_id} was not found for report {job_id}")
        return chunk
