from __future__ import annotations

import json
import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ENABLE_EMBEDDING_MODEL_LOADING", "false")
os.environ.setdefault("REQUIRE_EMBEDDING_MODEL_ON_STARTUP", "false")
os.environ["GEMINI_API_KEY"] = ""

from main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def collect_sse_events(client: TestClient, job_id: str) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    current_event = ""

    with client.stream("GET", f"/api/research/{job_id}/stream") as response:
        assert response.status_code == 200
        for line in response.iter_lines():
            if not line:
                continue
            if line.startswith("event:"):
                current_event = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                payload = json.loads(line.split(":", 1)[1].strip())
                events.append((current_event, payload))
                if current_event in {"complete", "error"}:
                    break

    return events
