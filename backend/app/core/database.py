from __future__ import annotations

from typing import Any

from app.core.config import Settings


class DatabaseManager:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._redis: Any = None
        self._mongo_client: Any = None
        self._qdrant: Any = None

    async def connect(self) -> None:
        self._redis = await self._build_redis()
        self._mongo_client = self._build_mongo()
        self._qdrant = self._build_qdrant()

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
        if self._mongo_client is not None:
            self._mongo_client.close()

    async def _build_redis(self) -> Any:
        from redis.asyncio import from_url

        return from_url(self._settings.redis_url, decode_responses=True)

    def _build_mongo(self) -> Any:
        from motor.motor_asyncio import AsyncIOMotorClient

        return AsyncIOMotorClient(self._settings.mongodb_url)

    def _build_qdrant(self) -> Any:
        from qdrant_client import QdrantClient

        return QdrantClient(url=self._settings.qdrant_url)

    def get_redis(self) -> Any:
        return self._redis

    def get_mongo(self) -> Any:
        return self._mongo_client

    def get_qdrant(self) -> Any:
        return self._qdrant

    def mongo_db(self) -> Any:
        return self._mongo_client[self._settings.mongodb_db]

    async def health(self) -> dict[str, dict[str, str]]:
        checks: dict[str, dict[str, str]] = {
            "redis": {"status": "unknown"},
            "mongo": {"status": "unknown"},
            "qdrant": {"status": "unknown"},
        }

        try:
            await self._redis.ping()
            checks["redis"] = {"status": "ok"}
        except Exception as exc:  # pragma: no cover
            checks["redis"] = {"status": "error", "detail": str(exc)}

        try:
            await self._mongo_client.admin.command("ping")
            checks["mongo"] = {"status": "ok"}
        except Exception as exc:  # pragma: no cover
            checks["mongo"] = {"status": "error", "detail": str(exc)}

        try:
            self._qdrant.get_collections()
            checks["qdrant"] = {"status": "ok"}
        except Exception as exc:  # pragma: no cover
            checks["qdrant"] = {"status": "error", "detail": str(exc)}

        return checks
