from __future__ import annotations

import re
from typing import Any

from app.core.config import Settings
from app.core.llm_config import EmbeddingGateway, LLMGateway
from app.core.logging import logger
from app.research_agent.models import FollowUpOutput


def _cosine_fallback_text(answer_chunks: list[dict]) -> str:
    if not answer_chunks:
        return "No relevant report chunks were available for this follow-up."
    bullet_lines = [f"- {chunk['text'][:240]}" for chunk in answer_chunks[:3]]
    return "Based on the indexed report chunks:\n" + "\n".join(bullet_lines)


class RAGService:
    def __init__(
        self,
        settings: Settings,
        qdrant: Any,
        embedder: EmbeddingGateway,
        llm: LLMGateway,
    ) -> None:
        self._settings = settings
        self._qdrant = qdrant
        self._embedder = embedder
        self._llm = llm
        self._log = logger("service.rag")

    def chunk_markdown(self, job_id: str, markdown: str, max_chars: int = 1800, overlap: int = 250) -> list[dict]:
        if not markdown.strip():
            return []

        sections = re.split(r"(?m)(?=^##\s|^###\s)", markdown)
        sections = [s.strip() for s in sections if s.strip()]

        chunks: list[dict] = []
        cursor = 0
        chunk_index = 0

        for section in sections:
            lines = section.splitlines()
            heading = lines[0] if lines and lines[0].startswith("#") else "## Untitled Section"
            body = section

            if len(body) <= max_chars:
                chunk_texts = [body]
            else:
                chunk_texts = []
                start = 0
                while start < len(body):
                    end = min(len(body), start + max_chars)
                    chunk_texts.append(body[start:end])
                    if end >= len(body):
                        break
                    start = max(0, end - overlap)

            for text in chunk_texts:
                chunk_id = f"{job_id}_chunk_{chunk_index}"
                chunk = {
                    "job_id": job_id,
                    "chunk_id": chunk_id,
                    "heading": heading,
                    "text": text,
                    "char_start": cursor,
                    "char_end": cursor + len(text),
                }
                chunks.append(chunk)
                cursor += len(text)
                chunk_index += 1

        return chunks

    async def ingest_report(self, job_id: str, report_markdown: str) -> list[dict]:
        chunks = self.chunk_markdown(job_id, report_markdown)
        collection_name = f"report_{job_id}"

        vectors = self._embedder.embed_texts([c["text"] for c in chunks])

        try:
            from qdrant_client.models import Distance, PointStruct, VectorParams

            self._qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=self._embedder.dimension, distance=Distance.COSINE),
            )
            points = [
                PointStruct(id=idx, vector=vectors[idx], payload=chunks[idx])
                for idx in range(len(chunks))
            ]
        except Exception:
            self._qdrant.create_collection(collection_name=collection_name, vectors_config={"size": self._embedder.dimension})

            class PointStruct:
                def __init__(self, id: int, vector: list[float], payload: dict) -> None:
                    self.id = id
                    self.vector = vector
                    self.payload = payload

            points = [PointStruct(id=idx, vector=vectors[idx], payload=chunks[idx]) for idx in range(len(chunks))]

        self._qdrant.upsert(collection_name=collection_name, points=points)
        return chunks

    def minimal_chunk_metadata(self, chunks: list[dict]) -> list[dict]:
        """Persist only lightweight chunk metadata in MongoDB to avoid payload duplication."""
        metadata = []
        for chunk in chunks:
            metadata.append(
                {
                    "chunk_id": chunk.get("chunk_id", ""),
                    "heading": chunk.get("heading", ""),
                    "char_start": int(chunk.get("char_start", 0)),
                    "char_end": int(chunk.get("char_end", 0)),
                }
            )
        return metadata

    async def get_chunks(self, job_id: str, chunk_hints: list[dict] | None = None) -> list[dict]:
        """
        Resolve full chunk content from Qdrant on demand.
        Falls back to Mongo metadata when Qdrant content is unavailable.
        """
        collection_name = f"report_{job_id}"
        full_chunks = self._load_all_chunks_from_qdrant(collection_name)
        if full_chunks:
            if chunk_hints:
                order_map = {hint.get("chunk_id"): idx for idx, hint in enumerate(chunk_hints)}
                full_chunks.sort(key=lambda c: order_map.get(c.get("chunk_id"), 10_000))
            return full_chunks

        # Fallback: return minimal metadata shape with empty text if Qdrant payload is unavailable.
        hints = chunk_hints or []
        fallback_rows = []
        for hint in hints:
            fallback_rows.append(
                {
                    "job_id": job_id,
                    "chunk_id": hint.get("chunk_id", ""),
                    "heading": hint.get("heading", ""),
                    "text": "",
                    "char_start": int(hint.get("char_start", 0)),
                    "char_end": int(hint.get("char_end", 0)),
                }
            )
        return fallback_rows

    async def get_chunk(self, job_id: str, chunk_id: str, chunk_hints: list[dict] | None = None) -> dict | None:
        chunks = await self.get_chunks(job_id=job_id, chunk_hints=chunk_hints)
        for chunk in chunks:
            if chunk.get("chunk_id") == chunk_id:
                return chunk
        return None

    def _load_all_chunks_from_qdrant(self, collection_name: str) -> list[dict]:
        # In-memory client path.
        if hasattr(self._qdrant, "list_chunks"):
            rows = self._qdrant.list_chunks(collection_name)
            return [dict(row) for row in rows]

        # Real Qdrant client path.
        chunks: list[dict] = []
        offset = None
        while True:
            points, next_offset = self._qdrant.scroll(
                collection_name=collection_name,
                with_payload=True,
                with_vectors=False,
                limit=128,
                offset=offset,
            )
            for point in points:
                payload = getattr(point, "payload", None) or {}
                chunks.append(dict(payload))
            if next_offset is None:
                break
            offset = next_offset
        return chunks

    async def answer_followup(self, job_id: str, question: str) -> FollowUpOutput:
        query_vector = self._embedder.embed_text(question)
        collection_name = f"report_{job_id}"
        log = logger("service.rag", job_id=job_id)

        if hasattr(self._qdrant, "query_points"):
            response = self._qdrant.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=self._settings.top_k_followup_chunks,
                with_payload=True,
            )
            results = list(getattr(response, "points", []) or [])
        else:
            results = self._qdrant.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=self._settings.top_k_followup_chunks,
                with_payload=True,
            )

        log.info(
            "Retrieved %s chunks for follow-up retrieval",
            len(results),
        )

        context_chunks = [
            {
                "chunk_id": row.payload.get("chunk_id", "unknown_chunk"),
                "text": row.payload.get("text", ""),
            }
            for row in results
        ]

        log.info(
            "Invoking follow-up inference with %s retrieved chunks (chunk_ids=%s, question_chars=%s)",
            len(context_chunks),
            ",".join(chunk["chunk_id"] for chunk in context_chunks) or "-",
            len(question),
        )

        context_str = "\n\n".join([f"[{c['chunk_id']}]: {c['text']}" for c in context_chunks])

        def fallback() -> FollowUpOutput:
            return FollowUpOutput(
                answer=_cosine_fallback_text(context_chunks),
                cited_chunk_ids=[c["chunk_id"] for c in context_chunks],
            )

        prompt = (
            "Answer the question using ONLY provided report chunks. "
            "Cite chunk ids used in the answer.\n\n"
            f"Chunks:\n{context_str}\n\n"
            f"Question: {question}"
        )

        return self._llm.structured_invoke(FollowUpOutput, prompt, fallback)

    async def delete_report_index(self, job_id: str) -> None:
        collection_name = f"report_{job_id}"
        try:
            self._qdrant.delete_collection(collection_name=collection_name)
        except Exception:
            # Missing collection is acceptable for cleanup endpoints.
            return None
