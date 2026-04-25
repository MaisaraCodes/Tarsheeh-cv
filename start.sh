#!/usr/bin/env bash
set -e

# Start FastAPI backend on internal port 8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &

# Start Next.js frontend in the foreground on the public port
PORT="${PORT:-5000}"
cd frontend
exec npx next start -p "$PORT" -H 0.0.0.0
