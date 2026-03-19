from __future__ import annotations

from tests.conftest import collect_sse_events


def test_jobs_list_detail_and_delete_flow(client) -> None:
    submit = client.post("/api/research", json={"topic": "Jobs endpoint flow", "depth": "quick"})
    assert submit.status_code == 200
    job_id = submit.json()["job_id"]

    events = collect_sse_events(client, job_id)
    assert any(event_name == "complete" for event_name, _ in events)

    jobs = client.get("/api/jobs")
    assert jobs.status_code == 200
    jobs_payload = jobs.json()
    assert isinstance(jobs_payload, list)
    job_rows = [row for row in jobs_payload if row["job_id"] == job_id]
    assert job_rows
    assert job_rows[0]["status"] == "complete"
    assert job_rows[0]["has_persisted_report"] is True

    detail = client.get(f"/api/jobs/{job_id}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["job_id"] == job_id
    assert detail_payload["status"] == "complete"
    assert detail_payload["report_id"] == job_id
    assert detail_payload["has_persisted_report"] is True

    delete = client.delete(f"/api/jobs/{job_id}")
    assert delete.status_code == 200
    assert delete.json() == {"job_id": job_id, "deleted": True}

    deleted_detail = client.get(f"/api/jobs/{job_id}")
    assert deleted_detail.status_code == 404

    deleted_history = client.get(f"/api/history/{job_id}")
    assert deleted_history.status_code == 404
