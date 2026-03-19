from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DepthName = Literal["quick", "standard", "deep"]
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


class DepthProfile(BaseModel):
    max_iterations: int = Field(ge=1)
    query_fanout: int = Field(ge=1)
    target_sections: int = Field(ge=1)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Open Deep Research Agent Backend"
    api_prefix: str = "/api"
    log_level: str = "INFO"

    gemini_model: str = "gemini-3.1-flash-lite-preview"
    gemini_api_key: str = ""
    tavily_api_key: str = ""
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dimension: int = 384
    enable_embedding_model_loading: bool = True
    embedding_device: str = "cpu"
    require_embedding_model_on_startup: bool = True

    redis_url: str = "redis://localhost:6379/0"
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "deep_research"
    qdrant_url: str = "http://localhost:6333"

    job_ttl_seconds: int = 86400
    stream_poll_interval_seconds: float = 1.0
    polish_min_ratio: float = 0.95

    depth_quick_iterations: int = 1
    depth_quick_query_fanout: int = 2
    depth_quick_target_sections: int = 4

    depth_standard_iterations: int = 2
    depth_standard_query_fanout: int = 3
    depth_standard_target_sections: int = 8

    depth_deep_iterations: int = 3
    depth_deep_query_fanout: int = 4
    depth_deep_target_sections: int = 12

    top_k_followup_chunks: int = 4

    def depth_profile(self, depth: DepthName) -> DepthProfile:
        if depth == "quick":
            return DepthProfile(
                max_iterations=self.depth_quick_iterations,
                query_fanout=self.depth_quick_query_fanout,
                target_sections=self.depth_quick_target_sections,
            )
        if depth == "deep":
            return DepthProfile(
                max_iterations=self.depth_deep_iterations,
                query_fanout=self.depth_deep_query_fanout,
                target_sections=self.depth_deep_target_sections,
            )
        return DepthProfile(
            max_iterations=self.depth_standard_iterations,
            query_fanout=self.depth_standard_query_fanout,
            target_sections=self.depth_standard_target_sections,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
