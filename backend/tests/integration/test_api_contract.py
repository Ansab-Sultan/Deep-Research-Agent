from __future__ import annotations

from tests.conftest import collect_sse_events


def test_api_contract_shapes_for_status_and_sse(client) -> None:
    submit = client.post("/api/research", json={"topic": "Contract Test", "depth": "quick"})
    assert submit.status_code == 200
    job_id = submit.json()["job_id"]

    status = client.get(f"/api/research/{job_id}")
    assert status.status_code == 200
    status_payload = status.json()
    assert set(status_payload.keys()) == {"job_id", "status", "report_id", "error"}

    events = collect_sse_events(client, job_id)
    progress = [evt for evt in events if evt[0] == "progress"]
    assert progress
    first_progress = progress[0][1]
    assert set(first_progress.keys()) == {"node", "progress", "ts"}

    complete = [evt for evt in events if evt[0] == "complete"]
    if complete:
        assert set(complete[-1][1].keys()) == {"job_id", "report_id"}
