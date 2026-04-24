"""End-to-end-ish coverage for the screening → ranking → ranking_complete
stage transitions exposed by /status.

The processing page in the frontend depends on these intermediate stages
being observable via short-interval polling. Task #16 introduced the
explicit publishing of `screening` and `ranking` between analyzer / ranker
runs; this test guards against future refactors silently regressing it.
"""
import threading
import time
import uuid

import pytest
from fastapi.testclient import TestClient

from backend.tests.fakes import FakeSupabase


# Make analyzer/ranker visibly slow so a polling loop can observe each
# intermediate stage without flakiness, but keep the test fast overall.
_ANALYZER_DELAY_S = 0.4
_RANKER_DELAY_S = 0.4
_POLL_INTERVAL_S = 0.05
_POLL_BUDGET_S = 5.0


@pytest.fixture
def fake_db() -> FakeSupabase:
    return FakeSupabase()


@pytest.fixture
def client(monkeypatch, fake_db):
    from backend.routes import candidates as cand_mod
    from backend.routes import status as status_mod

    # Route every Supabase call to the in-memory fake.
    monkeypatch.setattr(cand_mod, "get_supabase", lambda: fake_db)
    monkeypatch.setattr(status_mod, "get_supabase", lambda: fake_db)

    # Avoid pdfplumber + name resolver work — we don't need real PDFs to
    # exercise the stage-transition logic.
    monkeypatch.setattr(
        cand_mod, "_extract_pdf_text",
        lambda data, filename: f"resume text from {filename}",
    )
    monkeypatch.setattr(
        cand_mod, "resolve_candidate_name",
        lambda text, fname: f"Candidate {fname}",
    )

    # Stub LLM-driven analyzer / ranker with deterministic delays.
    def fake_run_analyzer(state):
        time.sleep(_ANALYZER_DELAY_S)
        analyses = []
        for c in state["candidates"]:
            analyses.append({
                "candidate_id": c["id"],
                "name": c.get("name") or "Unnamed",
                "analysis": {"score": 80, "summary": "ok"},
            })
        return {"all_cv_analyses": analyses}

    def fake_run_ranker(state):
        time.sleep(_RANKER_DELAY_S)
        from backend.models.ranking import RankedList, RankedCandidate
        ranked = []
        for i, a in enumerate(state["all_cv_analyses"], start=1):
            ranked.append(RankedCandidate(
                candidate_id=a["candidate_id"],
                name=a["name"],
                score=int(a["analysis"]["score"]),
                rank=i,
                summary="good",
            ))
        return {"ranking_result": RankedList(ranked_candidates=ranked)}

    monkeypatch.setattr(cand_mod, "run_analyzer", fake_run_analyzer)
    monkeypatch.setattr(cand_mod, "run_ranker", fake_run_ranker)

    # FastAPI's BackgroundTasks would otherwise run synchronously inside
    # TestClient and block the response, hiding the in-flight stages.
    # Wrap the pipeline so it actually runs in a real worker thread.
    real_pipeline = cand_mod._run_analysis_pipeline

    def threaded_pipeline(*args, **kwargs):
        threading.Thread(
            target=real_pipeline, args=args, kwargs=kwargs, daemon=True,
        ).start()

    monkeypatch.setattr(cand_mod, "_run_analysis_pipeline", threaded_pipeline)

    from backend.main import app
    return TestClient(app)


def _seed_job(fake_db: FakeSupabase) -> str:
    job_id = str(uuid.uuid4())
    fake_db.table("jobs").insert({
        "id": job_id,
        "parsed_profile": {
            "title": "Backend Engineer",
            "required_skills": ["python"],
            "experience_years": 1,
            "priorities": ["ship features"],
            "_locale": "en",
        },
    }).execute()
    return job_id


def _upload_two_cvs(client: TestClient, job_id: str):
    files = [
        ("files", ("alice.pdf", b"%PDF-1.4 dummy alice", "application/pdf")),
        ("files", ("bob.pdf", b"%PDF-1.4 dummy bob", "application/pdf")),
    ]
    return client.post("/candidates", data={"job_id": job_id}, files=files)


def test_pipeline_publishes_screening_then_ranking_then_complete(client, fake_db):
    job_id = _seed_job(fake_db)

    upload_resp = _upload_two_cvs(client, job_id)
    assert upload_resp.status_code == 200, upload_resp.text
    assert upload_resp.json()["candidates_queued"] == 2

    # Poll /status AND the underlying job_results.status column the task
    # contract is written against. /status maps the raw DB stage to a UI
    # stage name (e.g. "screening" -> "cv_analyzer"); we record both so we
    # can assert the canonical screening/ranking/ranking_complete sequence
    # while still verifying /status drives the UI to "complete".
    raw_stages: list[str] = []
    api_stages: list[str] = []
    deadline = time.time() + _POLL_BUDGET_S
    while time.time() < deadline:
        r = client.get(f"/status/{job_id}")
        assert r.status_code == 200, r.text
        body = r.json()

        api_stage = body["stage"]
        if not api_stages or api_stages[-1] != api_stage:
            api_stages.append(api_stage)

        db_row = fake_db.table("job_results").select("status") \
            .eq("job_id", job_id).limit(1).execute()
        if db_row.data:
            raw_stage = (db_row.data[0].get("status") or "").lower()
            if raw_stage and (not raw_stages or raw_stages[-1] != raw_stage):
                raw_stages.append(raw_stage)

        if body["status"] == "complete":
            break
        time.sleep(_POLL_INTERVAL_S)
    else:
        pytest.fail(
            f"pipeline did not complete in time; raw={raw_stages} api={api_stages}"
        )

    # Canonical task wording: screening -> ranking -> ranking_complete.
    def _ordered_index(seq: list[str], value: str) -> int:
        try:
            return seq.index(value)
        except ValueError:
            pytest.fail(f"missing stage {value!r} in observed sequence {seq}")

    i_screening = _ordered_index(raw_stages, "screening")
    i_ranking = _ordered_index(raw_stages, "ranking")
    i_complete = _ordered_index(raw_stages, "ranking_complete")
    assert i_screening < i_ranking < i_complete, (
        f"raw stages out of order: {raw_stages} "
        f"(expected screening < ranking < ranking_complete)"
    )

    # Sanity check the /status mapping the frontend actually consumes —
    # cv_analyzer (mapped from screening) must precede ranking, which must
    # precede complete in the API stage stream too.
    j_cv = _ordered_index(api_stages, "cv_analyzer")
    j_ranking = _ordered_index(api_stages, "ranking")
    j_complete = _ordered_index(api_stages, "complete")
    assert j_cv < j_ranking < j_complete, (
        f"api stages out of order: {api_stages} "
        f"(expected cv_analyzer < ranking < complete)"
    )


def test_status_returns_404_for_unknown_job(client):
    r = client.get(f"/status/{uuid.uuid4()}")
    assert r.status_code == 404
    assert r.json()["detail"] == "Job not found"
