from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import BackgroundTasks

from app.core.config import Settings
from app.core.errors import ConflictError, InternalError, NotFoundError
from app.schemas.events import CompleteEvent, ErrorEvent, ProgressEvent, utc_now_iso
from app.services.history_service import HistoryService
from app.services.rag_service import RAGService
from app.research_agent.graph import ResearchGraph


class ResearchService:
    def __init__(
        self,
        settings: Settings,
        redis_client,
        graph: ResearchGraph,
        history_service: HistoryService,
        rag_service: RAGService,
        log,
    ) -> None:
        self._settings = settings
        self._redis = redis_client
        self._graph = graph
        self._history = history_service
        self._rag = rag_service
        self._log = log

    def _job_key(self, job_id: str) -> str:
        return f"job:{job_id}"

    def _stream_key(self, job_id: str) -> str:
        return f"stream:{job_id}"

    @staticmethod
    def _parse_job_id_from_key(key: str) -> str:
        return key.split("job:", 1)[1]

    async def _redis_job_payload(self, job_id: str) -> dict | None:
        row = await self._redis.hgetall(self._job_key(job_id))
        if not row:
            return None
        status = row.get("status", "queued")
        report_id = row.get("report_id") or (job_id if status == "complete" else None)
        return {
            "job_id": job_id,
            "status": status,
            "title": row.get("title") or None,
            "depth": row.get("depth") or None,
            "created_at": row.get("created_at") or None,
            "report_id": report_id,
            "error": row.get("error") or None,
            "has_persisted_report": False,
        }

    async def submit_research(self, topic: str, depth: str, background_tasks: BackgroundTasks) -> dict:
        job_id = str(uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        await self._redis.hset(
            self._job_key(job_id),
            mapping={
                "status": "queued",
                "title": topic,
                "depth": depth,
                "created_at": created_at,
                "report_id": "",
                "error": "",
                "error_code": "",
            },
        )
        background_tasks.add_task(self.run_research_job, job_id, topic, depth)
        return {"job_id": job_id, "status": "queued"}

    async def run_research_job(self, job_id: str, topic: str, depth: str) -> None:
        logger = self._log
        await self._redis.hset(self._job_key(job_id), mapping={"status": "running"})

        async def on_progress(node: str, progress: str) -> None:
            event = {
                "type": "progress",
                **ProgressEvent(node=node, progress=progress, ts=utc_now_iso()).model_dump(),
            }
            await self._redis.rpush(self._stream_key(job_id), json.dumps(event))

        try:
            state = await self._graph.run(topic=topic, depth=depth, on_progress=on_progress)
            final_report = state.get("final_report") or state.get("report_draft") or ""
            sources = state.get("sources", [])

            await self._history.save_report(
                job_id=job_id,
                title=topic,
                report_markdown=final_report,
                sources=sources,
                depth=depth,
            )
            chunks = await self._rag.ingest_report(job_id=job_id, report_markdown=final_report)
            minimal_chunks = self._rag.minimal_chunk_metadata(chunks)
            await self._history.attach_chunks(job_id=job_id, chunks=minimal_chunks)

            await self._redis.hset(
                self._job_key(job_id),
                mapping={"status": "complete", "report_id": job_id, "error": "", "error_code": ""},
            )
            await self._redis.expire(self._job_key(job_id), self._settings.job_ttl_seconds)
            await self._redis.expire(self._stream_key(job_id), self._settings.job_ttl_seconds)
        except Exception as exc:
            logger.exception("research job failed", extra={"job_id": job_id})
            message = str(exc) or "Unknown job failure"
            await self._redis.hset(
                self._job_key(job_id),
                mapping={"status": "failed", "error": message, "error_code": "INTERNAL_JOB_ERROR"},
            )
            error_event = {
                "type": "error",
                **ErrorEvent(job_id=job_id, code="INTERNAL_JOB_ERROR", message=message).model_dump(),
            }
            await self._redis.rpush(self._stream_key(job_id), json.dumps(error_event))
            await self._redis.expire(self._job_key(job_id), self._settings.job_ttl_seconds)
            await self._redis.expire(self._stream_key(job_id), self._settings.job_ttl_seconds)

    async def get_job_status(self, job_id: str) -> dict:
        job = await self._redis_job_payload(job_id)
        if job:
            return {
                "job_id": job_id,
                "status": job["status"],
                "report_id": job["report_id"],
                "error": job["error"],
            }

        if await self._history.report_exists(job_id):
            return {"job_id": job_id, "status": "complete", "report_id": job_id, "error": None}

        raise NotFoundError("JOB_NOT_FOUND", f"Job {job_id} was not found")

    async def stream_research(self, job_id: str):
        if not await self._history.report_exists(job_id):
            redis_job = await self._redis.hgetall(self._job_key(job_id))
            if not redis_job:
                raise NotFoundError("JOB_NOT_FOUND", f"Job {job_id} was not found")

        cursor = 0
        emitted_error = False

        while True:
            events = await self._redis.lrange(self._stream_key(job_id), cursor, -1)
            for event_raw in events:
                cursor += 1
                event_obj = json.loads(event_raw)
                event_type = event_obj.get("type", "progress")
                if event_type == "progress":
                    payload = ProgressEvent.model_validate(event_obj).model_dump_json()
                    yield f"event: progress\ndata: {payload}\n\n"
                elif event_type == "error":
                    payload = ErrorEvent.model_validate(event_obj).model_dump_json()
                    emitted_error = True
                    yield f"event: error\ndata: {payload}\n\n"

            status = await self._redis.hget(self._job_key(job_id), "status")
            if status == "complete":
                report_id = await self._redis.hget(self._job_key(job_id), "report_id") or job_id
                payload = CompleteEvent(job_id=job_id, report_id=report_id).model_dump_json()
                yield f"event: complete\ndata: {payload}\n\n"
                return

            if status == "failed":
                if not emitted_error:
                    error_code = await self._redis.hget(self._job_key(job_id), "error_code") or "INTERNAL_JOB_ERROR"
                    error_msg = await self._redis.hget(self._job_key(job_id), "error") or "Unknown job failure"
                    payload = ErrorEvent(job_id=job_id, code=error_code, message=error_msg).model_dump_json()
                    yield f"event: error\ndata: {payload}\n\n"
                return



            await asyncio.sleep(self._settings.stream_poll_interval_seconds)

    async def require_report(self, job_id: str) -> dict:
        if not await self._history.report_exists(job_id):
            raise NotFoundError("REPORT_NOT_FOUND", f"Report {job_id} was not found")
        report = await self._history.get_report_detail(job_id)
        if report is None:
            raise InternalError("REPORT_LOOKUP_FAILED", "Failed to resolve report")
        return report

    async def list_jobs(self, limit: int = 100) -> list[dict]:
        history_rows = await self._history.get_history(limit=limit)
        merged: dict[str, dict] = {
            str(row["_id"]): {
                "job_id": str(row["_id"]),
                "status": "complete",
                "title": row.get("title"),
                "depth": row.get("depth"),
                "created_at": row.get("created_at"),
                "report_id": str(row["_id"]),
                "error": None,
                "has_persisted_report": True,
            }
            for row in history_rows
        }

        job_keys = await self._redis.keys("job:*")
        for key in job_keys:
            job_id = self._parse_job_id_from_key(key)
            redis_job = await self._redis_job_payload(job_id)
            if redis_job is None:
                continue

            existing = merged.get(job_id, {})
            status = redis_job["status"]
            merged[job_id] = {
                "job_id": job_id,
                "status": status if status in {"queued", "running", "failed"} else existing.get("status", "complete"),
                "title": redis_job.get("title") or existing.get("title"),
                "depth": redis_job.get("depth") or existing.get("depth"),
                "created_at": redis_job.get("created_at") or existing.get("created_at"),
                "report_id": redis_job.get("report_id") or existing.get("report_id"),
                "error": redis_job.get("error"),
                "has_persisted_report": bool(existing.get("has_persisted_report", False)),
            }

        rows = sorted(merged.values(), key=lambda item: item.get("created_at") or "", reverse=True)
        return rows[:limit]

    async def get_job_detail(self, job_id: str) -> dict:
        redis_job = await self._redis_job_payload(job_id)
        report_exists = await self._history.report_exists(job_id)
        report = await self._history.get_report_detail(job_id) if report_exists else None

        if redis_job is None and report is None:
            raise NotFoundError("JOB_NOT_FOUND", f"Job {job_id} was not found")

        status = redis_job["status"] if redis_job else "complete"
        return {
            "job_id": job_id,
            "status": status,
            "title": (redis_job or {}).get("title") or (report or {}).get("title"),
            "depth": (redis_job or {}).get("depth") or (report or {}).get("depth"),
            "created_at": (redis_job or {}).get("created_at") or (report or {}).get("created_at"),
            "report_id": (redis_job or {}).get("report_id") or (job_id if report_exists else None),
            "error": (redis_job or {}).get("error"),
            "has_persisted_report": report_exists,
        }

    async def delete_job(self, job_id: str) -> dict:
        redis_job = await self._redis_job_payload(job_id)
        report_exists = await self._history.report_exists(job_id)
        if redis_job is None and not report_exists:
            raise NotFoundError("JOB_NOT_FOUND", f"Job {job_id} was not found")

        status = (redis_job or {}).get("status")
        if status in {"queued", "running"}:
            raise ConflictError("JOB_ACTIVE_DELETE_CONFLICT", f"Job {job_id} is currently {status} and cannot be deleted")

        await self._redis.delete(self._job_key(job_id), self._stream_key(job_id))
        await self._history.delete_report(job_id)
        await self._rag.delete_report_index(job_id)
        return {"job_id": job_id, "deleted": True}
