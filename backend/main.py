from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# Allow `uvicorn main:app` when launched from `backend`.
if __package__ in {None, ""}:
    backend_dir = Path(__file__).resolve().parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from create_index import create_startup_indexes
from app.core.database import DatabaseManager
from app.core.errors import AppError
from app.core.llm_config import EmbeddingGateway, LLMGateway
from app.core.logging import logger, request_id_var, setup_logging
from app.research_agent.graph import ResearchGraph
from app.routers.health import router as health_router
from app.routers.history import router as history_router
from app.routers.research import router as research_router
from app.services.followup_service import FollowUpService
from app.services.history_service import HistoryService
from app.services.rag_service import RAGService
from app.services.research_service import ResearchService

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level)
    startup_log = logger("startup")

    db = DatabaseManager(settings)
    await db.connect()
    created_indexes = await create_startup_indexes(db.mongo_db())
    startup_log.info("startup indexes ensured: %s", created_indexes)
    db_checks = await db.health()
    startup_log.info("database health checks completed: %s", db_checks)

    llm = LLMGateway(settings)
    embedder = EmbeddingGateway(settings)
    startup_log.info("llm availability: %s", "ok" if llm.available else "degraded")
    startup_log.info("embedding provider: %s", embedder.health_check())
    history_service = HistoryService(db.mongo_db())
    rag_service = RAGService(settings, db.get_qdrant(), embedder, llm)
    graph = ResearchGraph(settings, llm)

    app.state.settings = settings
    app.state.db = db
    app.state.llm = llm
    app.state.embedder = embedder
    app.state.history_service = history_service
    app.state.rag_service = rag_service
    app.state.followup_service = FollowUpService(history_service, rag_service)
    app.state.research_service = ResearchService(
        settings=settings,
        redis_client=db.get_redis(),
        graph=graph,
        history_service=history_service,
        rag_service=rag_service,
        log=logger("service.research"),
    )

    yield

    await db.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("x-request-id") or str(uuid4())
    token = request_id_var.set(req_id)
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["x-request-id"] = req_id
    return response


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"code": exc.code, "message": exc.message})


app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(research_router, prefix=settings.api_prefix)
app.include_router(history_router, prefix=settings.api_prefix)
