# Tarsheeh.cv — Replit Project

## Overview
AI-powered talent acquisition platform using multi-agent AI pipeline for CV screening, ranking, and interview question generation.

## Architecture
- **Frontend**: Next.js 16 (Turbopack) — `./frontend/` — runs on port 5000
- **Backend**: FastAPI + LangGraph agents — `./backend/` — runs on port 8000

## Workflows
- `Start application` — Next.js dev server (`cd frontend && npm run dev`)
- `Backend API` — FastAPI + uvicorn (`python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`)

## Key Files
- `frontend/next.config.ts` — Next.js config with Replit dev origin allowlist + `/api/*` rewrite to backend on `localhost:8000`
- `frontend/lib/api.ts` — API client; defaults to relative `/api` (proxied by Next), overridable via `NEXT_PUBLIC_API_URL`
- `backend/main.py` — FastAPI entrypoint; wires routers from `backend/routes/`
- `backend/agents/graph.py` — Four independent LangGraph subgraphs: `intake_graph`, `analysis_graph` (analyzer→ranker), `interview_graph`, `report_graph`
- `backend/agents/intake_agent.py`, `cv_analyzer.py`, `ranking_agent.py`, `interview_agent.py`, `report_agent.py` — Agent implementations
- `backend/routes/jobs.py`, `candidates.py`, `status.py`, `results.py`, `questions.py`, `report.py` — Six route handlers matching the locked API contract
- `backend/rag/retriever.py` — Semantic search over Supabase knowledge base
- `backend/utils/supabase_client.py` — Lazy Supabase client singleton

## Pipeline Flow
1. **POST /job** → `intake_graph` parses description with GPT-4o → persists `JobProfile` to `jobs.parsed_profile`
2. **POST /candidates** → extracts PDF text via pdfplumber → persists candidate rows → `analysis_graph` runs CV Analyzer (RAG-augmented GPT-4o) per CV then Ranking Agent → persists scorecards on `candidates`, ranked aggregate on `job_results`. Candidate names are threaded through state and re-asserted post-ranking to prevent LLM name hallucination.
3. **GET /status/{job_id}** → derives stage (`intake` → `cv_analyzer` → `ranking` → `interview` → `report` → `complete`) and progress from row presence.
4. **GET /results/{job_id}** → reads `job_results.ranked_candidates`.
5. **GET /questions/{candidate_id}** → lazily invokes `interview_graph` (5 questions, GPT-4o) on first call, caches in `candidates.interview_questions`.
6. **GET /report/{job_id}** → invokes `report_graph` to render a ReportLab PDF and streams it as `application/pdf`. `job_results.generated_pdf_url` stores a `"generated"` marker (column is VARCHAR(512), too small for the PDF itself); regenerated on every request.

## Environment Variables Required
See `.env.example` for the full list. Critical vars:
- `OPENAI_API_KEY` — Required for all LLM and embedding calls
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — Required for DB and RAG retrieval
- `SUPABASE_SERVICE_KEY` — Used by backend for privileged DB writes
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public Supabase vars for frontend

## Package Manager
- Frontend: npm (package-lock.json)
- Backend: pip (`backend/requirements.txt`). Notable additions: `reportlab` (PDF generation), `python-multipart` (multipart/form-data for `/candidates`).

## Replit Migration Notes
- Backend clients (OpenAI, Supabase) are lazily initialized — app starts without env vars, errors only on first API call
- Backend runs from workspace root so `backend.*` absolute imports resolve correctly
- Frontend configured with `allowedDevOrigins` pointing to `REPLIT_DEV_DOMAIN` for HMR support
