from __future__ import annotations

import hashlib
import math
from typing import Callable, Iterable, TypeVar

from pydantic import BaseModel

from app.core.config import Settings
from app.core.logging import logger

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMGateway:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None
        if settings.gemini_api_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI

                self._model = ChatGoogleGenerativeAI(
                    model=settings.gemini_model,
                    google_api_key=settings.gemini_api_key,
                    temperature=0.2,
                )
            except Exception:
                self._model = None

    @property
    def available(self) -> bool:
        return self._model is not None

    def structured_invoke(
        self,
        schema: type[SchemaT],
        prompt: str,
        fallback_factory: Callable[[], SchemaT],
    ) -> SchemaT:
        if self._model is None:
            return fallback_factory()
        try:
            structured = self._model.with_structured_output(schema)
            result = structured.invoke(prompt)
            if isinstance(result, schema):
                return result
            if isinstance(result, dict):
                return schema.model_validate(result)
            return fallback_factory()
        except Exception:
            return fallback_factory()

    def text_invoke(self, prompt: str, fallback_text: str) -> str:
        if self._model is None:
            return fallback_text
        try:
            result = self._model.invoke(prompt)
            content = getattr(result, "content", "")
            return str(content).strip() or fallback_text
        except Exception:
            return fallback_text


class EmbeddingGateway:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._dimension = settings.embedding_dimension
        self._model = None
        self._device = settings.embedding_device
        self._load_error: str | None = None
        self._log = logger("embedding")
        if settings.enable_embedding_model_loading:
            try:
                from sentence_transformers import SentenceTransformer

                self._log.info("Preloading embedding model %s on %s", settings.embedding_model, self._device)
                self._model = SentenceTransformer(settings.embedding_model, device=self._device)
                test_vec = self._model.encode(["health"], normalize_embeddings=True, show_progress_bar=False)[0]
                self._dimension = int(len(test_vec))
                self._log.info(
                    "Embedding model ready: %s (device=%s, dim=%s)",
                    settings.embedding_model,
                    self._device,
                    self._dimension,
                )
            except Exception as exc:
                self._model = None
                self._load_error = str(exc)
                self._log.exception(
                    "Embedding preload failed for %s on %s",
                    settings.embedding_model,
                    self._device,
                )

        if settings.enable_embedding_model_loading and settings.require_embedding_model_on_startup and self._model is None:
            detail = self._load_error or "unknown model load error"
            raise RuntimeError(
                f"Embedding model failed to preload on startup ({settings.embedding_model}, device={self._device}): {detail}"
            )

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def available(self) -> bool:
        return self._model is not None

    def embed_texts(self, texts: Iterable[str]) -> list[list[float]]:
        text_list = list(texts)
        if not text_list:
            return []
        if self._model is not None:
            vectors = self._model.encode(text_list, normalize_embeddings=True)
            return [list(map(float, row)) for row in vectors]
        return [self._deterministic_embedding(t) for t in text_list]

    def embed_text(self, text: str) -> list[float]:
        provider = self._settings.embedding_model if self._model is not None else "deterministic-fallback"
        self._log.info("Embedding query text using %s (chars=%s)", provider, len(text))
        return self.embed_texts([text])[0]

    def _deterministic_embedding(self, text: str) -> list[float]:
        values = [0.0] * self._dimension
        if not text:
            return values
        for idx, char in enumerate(text.encode("utf-8")):
            digest = hashlib.sha256(f"{idx}:{char}".encode("utf-8")).digest()
            bucket = digest[0] % self._dimension
            values[bucket] += (digest[1] / 255.0) - 0.5
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        return [v / norm for v in values]

    def health_check(self) -> dict[str, str]:
        if self._model is not None:
            return {"status": "ok", "provider": "sentence-transformers", "device": self._device}
        return {"status": "degraded", "provider": "deterministic-fallback"}
