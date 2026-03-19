from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.errors import NotFoundError


class HistoryService:
    def __init__(self, mongo_db: Any) -> None:
        self._reports = mongo_db.reports

    async def save_report(
        self,
        job_id: str,
        title: str,
        report_markdown: str,
        sources: list[str],
        depth: str,
    ) -> None:
        await self._reports.insert_one(
            {
                "_id": job_id,
                "title": title,
                "report_markdown": report_markdown,
                "sources": sources,
                "depth": depth,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "chunks": [],
                "followups": [],
            }
        )

    async def attach_chunks(self, job_id: str, chunks: list[dict]) -> None:
        await self._reports.update_one({"_id": job_id}, {"$set": {"chunks": chunks}})

    async def save_followup(
        self,
        job_id: str,
        question: str,
        answer: str,
        cited_chunk_ids: list[str],
    ) -> None:
        result = await self._reports.update_one(
            {"_id": job_id},
            {
                "$push": {
                    "followups": {
                        "question": question,
                        "answer": answer,
                        "cited_chunk_ids": cited_chunk_ids,
                        "asked_at": datetime.now(timezone.utc).isoformat(),
                    }
                }
            },
        )
        matched_count = getattr(result, "matched_count", None)
        if matched_count is None and isinstance(result, dict):
            matched_count = result.get("matched_count", 1)
        if int(matched_count or 0) == 0:
            raise NotFoundError("REPORT_NOT_FOUND", f"Report {job_id} was not found")

    async def get_history(self, limit: int = 50) -> list[dict]:
        cursor = self._reports.find({}, {"_id": 1, "title": 1, "depth": 1, "created_at": 1}).sort("created_at", -1)
        return await cursor.to_list(length=limit)

    async def get_report_detail(self, job_id: str) -> dict:
        report = await self._reports.find_one({"_id": job_id})
        if report is None:
            raise NotFoundError("REPORT_NOT_FOUND", f"Report {job_id} was not found")
        return report

    async def report_exists(self, job_id: str) -> bool:
        doc = await self._reports.find_one({"_id": job_id}, {"_id": 1})
        return doc is not None

    async def delete_report(self, job_id: str) -> bool:
        result = await self._reports.delete_one({"_id": job_id})
        deleted_count = getattr(result, "deleted_count", None)
        if deleted_count is None and isinstance(result, dict):
            deleted_count = result.get("deleted_count", 0)
        return int(deleted_count or 0) > 0
