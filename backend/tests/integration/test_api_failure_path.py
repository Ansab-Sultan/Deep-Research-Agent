from __future__ import annotations

from tests.conftest import collect_sse_events


def test_failure_path_emits_terminal_error_event_and_failed_status(client) -> None:
    original_run = client.app.state.research_service._graph.run

    async def failing_run(topic: str, depth: str, on_progress=None):
        if on_progress:
            await on_progress("planner", "✓ Research plan created")
        raise RuntimeError("forced failure for test")

    client.app.state.research_service._graph.run = failing_run
    try:
        submit = client.post("/api/research", json={"topic": "Failure Case", "depth": "quick"})
        assert submit.status_code == 200
        job_id = submit.json()["job_id"]

        events = collect_sse_events(client, job_id)
        assert any(evt[0] == "error" for evt in events)
        error_payload = [evt[1] for evt in events if evt[0] == "error"][-1]
        assert error_payload["code"] == "INTERNAL_JOB_ERROR"

        status = client.get(f"/api/research/{job_id}")
        assert status.status_code == 200
        payload = status.json()
        assert payload["status"] == "failed"
        assert payload["error"]
    finally:
        client.app.state.research_service._graph.run = original_run
