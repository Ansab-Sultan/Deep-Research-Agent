# Technical Specification
## Open Deep Research Agent

**Version:** 2.0  
**Author:** Muhammad Ansab Sultan  
**Date:** March 2026  
**Status:** Implemented (Backend)

---

## 1. Architecture (As Implemented)

The backend follows a hybrid layered structure under `backend/app`:

- `routers` - HTTP endpoints (research, jobs, history, health)
- `schemas` - Pydantic request/response + event contracts
- `services` - orchestration/business logic
- `core` - config, database clients, logging, errors, LLM/embedding setup
- `research_agent` - LangGraph state + nodes + graph wiring

The application bootstraps in `app/main.py`, initializes clients/services in lifespan startup, and runs research jobs through FastAPI `BackgroundTasks`.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| Agent Graph | LangGraph |
| LLM | Gemini `gemini-3.1-flash-lite-preview` |
| Embeddings | `BAAI/bge-small-en-v1.5` |
| Search | Tavily |
| Runtime State | Redis |
| Durable Store | MongoDB |
| Vector Store | Qdrant |
| Dependency Tooling | `uv` + `pyproject.toml` |

---

## 3. Agent Graph Flow

Graph nodes:

1. `planner`
2. `researcher`
3. `summarizer`
4. `critic`
5. `writer_planner`
6. `section_writer` (loop)
7. `polish`

Research loop behavior:

- `planner -> researcher -> summarizer -> critic`
- If critic says insufficient and max iterations not reached, loop back to `researcher`
- Otherwise continue to `writer_planner`

Writing behavior:

- `writer_planner` produces section outline
- `section_writer` writes one section per pass and appends to `section_drafts`
- Loop until all sections are written
- Assemble `report_draft`
- `polish` runs as constrained pass

Long-form constraints:

- Section drafts are append-only during the run
- Final polish must retain at least 95% of draft word count
- If polish output is too short, fallback keeps/uses draft-safe output

Depth profiles (`core/config.py`):

- `quick`: 1 iteration, fanout 2, target sections 4
- `standard`: 2 iterations, fanout 3, target sections 8
- `deep`: 3 iterations, fanout 4, target sections 12

---

## 4. API Surface (As Implemented)

All endpoints are under `/api`.

### 4.1 Research Runtime

- `POST /research` -> submit job, returns `{job_id, status}`
- `GET /research/{job_id}` -> runtime status
- `GET /research/{job_id}/stream` -> SSE stream
- `POST /research/{job_id}/followup` -> follow-up QA
- `GET /research/{job_id}/chunks` -> resolved chunk payloads

### 4.2 Job Management

- `GET /jobs` -> list active + completed jobs
- `GET /jobs/{job_id}` -> single job detail
- `DELETE /jobs/{job_id}` -> full cleanup

Delete policy:

- Completed/failed job: allowed (Redis + Mongo + Qdrant cleanup)
- Active (`queued`/`running`) job: conflict response

### 4.3 History

- `GET /history` -> list canonical report history
- `GET /history/{job_id}` -> full canonical report document

### 4.4 Health

- `GET /health` -> Redis/Mongo/Qdrant + model readiness snapshot

---

## 5. SSE Contract

`GET /research/{job_id}/stream` emits:

- `progress`: `{node, progress, ts}`
- `complete`: `{job_id, report_id}`
- `error`: `{job_id, code, message}`

Stream terminates on `complete` or `error`.

---

## 6. Data Storage Strategy

## 6.1 Redis (Ephemeral Runtime)

Redis stores job runtime and stream events only.

Key patterns:

- `job:{job_id}` (Hash)
- `stream:{job_id}` (List)

Runtime hash fields:

- `status` (`queued|running|complete|failed`)
- `title`
- `depth`
- `created_at`
- `report_id` (when complete)
- `error`
- `error_code`

TTL is applied for job/stream runtime keys.

## 6.2 MongoDB (Canonical Record)

Collection: `reports`

Document shape:

- `_id` (job_id)
- `title`
- `report_markdown`
- `sources`
- `depth`
- `created_at`
- `chunks` (minimal metadata only)
- `followups` (array of `{question, answer, cited_chunk_ids, asked_at}`)

Chunk metadata stored in Mongo intentionally excludes full chunk text to avoid duplication.

## 6.3 Qdrant (Vector + Chunk Payload)

Collection name per report:

- `report_{job_id}`

Stored payload includes full chunk text and metadata, used for:

- follow-up retrieval (`top_k_followup_chunks`, default 4)
- full chunk resolution for citations/UI

---

## 7. Chunking & Embeddings

Chunking (`RAGService.chunk_markdown`):

- Split by Markdown headings (`##` / `###`)
- Enforce char window with overlap:
  - `max_chars = 1800`
  - `overlap = 250`
- Emit metadata:
  - `chunk_id`, `heading`, `char_start`, `char_end`, `text`

Embedding runtime (`EmbeddingGateway`):

- `ENABLE_EMBEDDING_MODEL_LOADING=true`:
  - Loads `BAAI/bge-small-en-v1.5` using `sentence-transformers` during startup
  - Uses `EMBEDDING_DEVICE` (configured as `cpu`)
- `REQUIRE_EMBEDDING_MODEL_ON_STARTUP=true`:
  - Startup fails fast if embedding preload fails
- `ENABLE_EMBEDDING_MODEL_LOADING=false`:
  - Uses deterministic embedding fallback (no model load)

---

## 8. Startup, Indexing, and Config

Config loading:

- `core/config.py` resolves `.env` from absolute backend path
- Settings are injected into services; components do not read `.env` directly

Startup sequence (`main.py`):

1. Load settings
2. Connect Redis/Mongo/Qdrant
3. Ensure Mongo indexes via `app/create_index.py`
4. Run health checks
5. Construct gateways, services, and graph

Mongo startup indexes:

- `idx_reports_created_at_desc`
- `idx_reports_depth_created_at_desc`
- `idx_reports_title`

Database mode:

- Real clients only (in-memory DB backends removed)

---

## 9. Current Backend Tree

```text
backend/app/
├── main.py
├── create_index.py
├── core/
│   ├── config.py
│   ├── database.py
│   ├── llm_config.py
│   ├── logging.py
│   └── errors.py
├── routers/
│   ├── research.py
│   ├── history.py
│   └── health.py
├── schemas/
├── services/
│   ├── research_service.py
│   ├── history_service.py
│   ├── rag_service.py
│   └── followup_service.py
└── research_agent/
    ├── graph.py
    ├── state.py
    ├── models.py
    └── nodes/
```

---

## 10. Environment Variables

```env
GEMINI_MODEL=gemini-3.1-flash-lite-preview
GEMINI_API_KEY=
TAVILY_API_KEY=
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384
ENABLE_EMBEDDING_MODEL_LOADING=true
EMBEDDING_DEVICE=cpu
REQUIRE_EMBEDDING_MODEL_ON_STARTUP=true

REDIS_URL=redis://localhost:6379/0
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=deep_research
QDRANT_URL=http://localhost:6333
```

This document reflects the current backend implementation state.
