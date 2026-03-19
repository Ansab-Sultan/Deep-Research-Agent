from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.research import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    db_health = await request.app.state.db.health()
    llm_status = {"status": "ok" if request.app.state.llm.available else "degraded", "provider": "gemini-fallback"}
    embedding_status = request.app.state.embedder.health_check()

    overall = "ok"
    if any(v.get("status") == "error" for v in db_health.values()):
        overall = "error"
    elif llm_status["status"] != "ok" or embedding_status.get("status") != "ok":
        overall = "degraded"

    return HealthResponse(status=overall, services=db_health, llm=llm_status, embedding=embedding_status)
