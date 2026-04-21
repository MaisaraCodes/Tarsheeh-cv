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
- `frontend/next.config.ts` — Next.js config with Replit dev origin allowlist
- `frontend/lib/api.ts` — API client; uses `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000`)
- `backend/main.py` — FastAPI entrypoint; imports LangGraph graph
- `backend/agents/graph.py` — LangGraph pipeline (intake → analyzer → ranker)
- `backend/rag/retriever.py` — Semantic search over Supabase knowledge base
- `backend/utils/supabase_client.py` — Lazy Supabase client singleton

## Environment Variables Required
See `.env.example` for the full list. Critical vars:
- `OPENAI_API_KEY` — Required for all LLM and embedding calls
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — Required for DB and RAG retrieval
- `SUPABASE_SERVICE_KEY` — Used by backend for privileged DB writes
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public Supabase vars for frontend

## Package Manager
- Frontend: npm (package-lock.json)
- Backend: pip (requirements.txt)

## Replit Migration Notes
- Backend clients (OpenAI, Supabase) are lazily initialized — app starts without env vars, errors only on first API call
- Backend runs from workspace root so `backend.*` absolute imports resolve correctly
- Frontend configured with `allowedDevOrigins` pointing to `REPLIT_DEV_DOMAIN` for HMR support
