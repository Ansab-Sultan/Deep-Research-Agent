# Implementation Plan (Updated)
## Open Deep Research Agent

**Version:** 2.0  
**Author:** Muhammad Ansab Sultan  
**Date:** March 2026  
**Status:** Backend Implemented, Frontend Pending

---

## 1. Scope

This updated plan reflects what is already implemented in the backend and what remains.

Implemented architecture layers:

- `routers`
- `schemas`
- `services`
- `core`
- `research_agent` (LangGraph)

---

## 2. Implemented Backend Slices

## 2.1 Foundation

- [x] `backend/app` hybrid layer structure
- [x] `core/config.py` with `.env` loading (absolute backend path)
- [x] `core/llm_config.py` for Gemini + embedding gateway
- [x] `core/database.py` real client manager for Redis/Mongo/Qdrant
- [x] `.env` and `.env.example`
- [x] `uv` + `pyproject.toml`

## 2.2 Research Job Runtime + Streaming

- [x] `POST /api/research`
- [x] `GET /api/research/{job_id}`
- [x] `GET /api/research/{job_id}/stream` (SSE)
- [x] `GET /api/health`
- [x] BackgroundTask orchestration
- [x] Redis runtime status/event transport
- [x] terminal SSE states: `complete`, `error`

## 2.3 LangGraph Agent Core

- [x] Nodes: `planner`, `researcher`, `summarizer`, `critic`, `writer_planner`, `section_writer`, `polish`
- [x] Depth profiles:
  - quick: 1 iter, fanout 2, ~4 sections
  - standard: 2 iter, fanout 3, ~8 sections
  - deep: 3 iter, fanout 4, ~12 sections
- [x] Long-form policy:
  - append-only `section_drafts`
  - assembled `report_draft`
  - polish retention guard (>=95%)

## 2.4 Persistence + RAG + History

- [x] MongoDB canonical report persistence
- [x] Redis ephemeral runtime metadata only
- [x] Qdrant ingestion after report completion
- [x] Chunk metadata in Mongo only (no duplicate full chunk text)
- [x] Full chunk text resolved from Qdrant on demand
- [x] Follow-up persistence in Mongo

Implemented endpoints:

- [x] `POST /api/research/{job_id}/followup`
- [x] `GET /api/research/{job_id}/chunks`
- [x] `GET /api/history`
- [x] `GET /api/history/{job_id}`

## 2.5 Job Management Endpoints

- [x] `GET /api/jobs` (list active + completed)
- [x] `GET /api/jobs/{job_id}`
- [x] `DELETE /api/jobs/{job_id}` full cleanup

Delete behavior:

- [x] Completed/failed -> delete Redis + Mongo + Qdrant
- [x] Queued/running -> conflict (no destructive delete while active)

## 2.6 Hardening

- [x] Structured logging + request IDs
- [x] Domain error mapping (`AppError` hierarchy)
- [x] Startup health checks for Redis/Mongo/Qdrant
- [x] Startup Mongo index creation (`app/create_index.py`)

---

## 3. Model and Embedding Decisions

- LLM: `gemini-3.1-flash-lite-preview`
- Embedding model: `BAAI/bge-small-en-v1.5`
- `ENABLE_EMBEDDING_MODEL_LOADING=true` -> preload sentence-transformers embedding model on startup
- `EMBEDDING_DEVICE=cpu` -> run embedding inference on CPU
- `REQUIRE_EMBEDDING_MODEL_ON_STARTUP=true` -> fail fast if preload fails
- `ENABLE_EMBEDDING_MODEL_LOADING=false` -> deterministic fallback embeddings

---

## 4. Current Test Status

- [x] Unit + integration suite present for graph/service/API contracts
- [x] Latest backend run passing (`7 passed`)

---

## 5. Remaining Work (Non-backend)

- [ ] Full frontend chat/history UX wiring to new jobs endpoints
- [ ] Production deployment packaging (if required)
- [ ] Optional observability expansion (metrics/traces)

---

## 6. Definition of Done (Backend)

Backend is considered done for current scope when:

- [x] All implemented APIs return documented contracts
- [x] Redis/Mongo/Qdrant responsibilities are clearly separated
- [x] LangGraph pipeline runs end-to-end with long-form constraints
- [x] Documentation reflects current behavior
