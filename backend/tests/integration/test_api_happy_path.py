from __future__ import annotations

from tests.conftest import collect_sse_events


def test_end_to_end_happy_path_with_followup_and_history(client) -> None:
    submit = client.post("/api/research", json={"topic": "AI maintenance triage", "depth": "quick"})
    assert submit.status_code == 200

    payload = submit.json()
    job_id = payload["job_id"]
    assert payload["status"] == "queued"

    events = collect_sse_events(client, job_id)
    progress_events = [item for item in events if item[0] == "progress"]
    assert progress_events
    assert any("Writing section" in evt[1]["progress"] for evt in progress_events)

    complete = [item for item in events if item[0] == "complete"]
    assert complete
    assert complete[-1][1]["report_id"] == job_id

    status = client.get(f"/api/research/{job_id}")
    assert status.status_code == 200
    status_payload = status.json()
    assert status_payload["status"] == "complete"
    assert "report" not in status_payload
    assert "sources" not in status_payload

    detail = client.get(f"/api/history/{job_id}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["_id"] == job_id
    assert detail_payload["report_markdown"]
    assert isinstance(detail_payload["chunks"], list)
    if detail_payload["chunks"]:
        assert "chunk_id" in detail_payload["chunks"][0]
        assert "text" not in detail_payload["chunks"][0]

    chunks = client.get(f"/api/research/{job_id}/chunks")
    assert chunks.status_code == 200
    chunk_rows = chunks.json()
    assert len(chunk_rows) > 0
    assert "text" in chunk_rows[0]

    followup = client.post(
        f"/api/research/{job_id}/followup",
        json={"question": "What are the main implementation risks?"},
    )
    assert followup.status_code == 200
    follow_payload = followup.json()
    assert follow_payload["answer"]
    assert len(follow_payload["cited_chunk_ids"]) > 0

    detail_after = client.get(f"/api/history/{job_id}")
    assert detail_after.status_code == 200
    followups = detail_after.json()["followups"]
    assert len(followups) >= 1
