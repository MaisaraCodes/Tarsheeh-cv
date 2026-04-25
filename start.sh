#!/usr/bin/env bash
# Production entrypoint for Replit autoscale deployment.
# Starts the FastAPI backend, waits for it to become healthy, then execs the
# Next.js production server in the foreground. If the backend dies at any
# point, the whole script exits non-zero so the platform marks the deploy
# unhealthy instead of serving a half-broken app.

set -u
set -o pipefail

BACKEND_HOST="127.0.0.1"
BACKEND_PORT="8000"
BACKEND_HEALTH_URL="http://${BACKEND_HOST}:${BACKEND_PORT}/health"
BACKEND_BOOT_TIMEOUT_SECS="${BACKEND_BOOT_TIMEOUT_SECS:-45}"
FRONTEND_PORT="${PORT:-5000}"

log() {
  printf '[start.sh] %s\n' "$*"
}

log "Launching FastAPI backend on ${BACKEND_HOST}:${BACKEND_PORT}..."
# Inherit this script's stdout/stderr so uvicorn logs land in the deployment
# log stream and are visible during cold starts and crashes.
python -u -m uvicorn backend.main:app \
  --host "${BACKEND_HOST}" --port "${BACKEND_PORT}" \
  --log-level info &
BACKEND_PID=$!

# If anything below fails, make sure we don't leave uvicorn behind.
cleanup() {
  if kill -0 "${BACKEND_PID}" 2>/dev/null; then
    log "Stopping backend (pid ${BACKEND_PID})..."
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Poll /health until the backend answers 200 or we time out.
log "Waiting up to ${BACKEND_BOOT_TIMEOUT_SECS}s for backend to become healthy..."
deadline=$(( $(date +%s) + BACKEND_BOOT_TIMEOUT_SECS ))
healthy=0
while [ "$(date +%s)" -lt "${deadline}" ]; do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    log "ERROR: backend exited before becoming healthy."
    exit 1
  fi
  if curl -fsS --max-time 2 "${BACKEND_HEALTH_URL}" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 0.25
done

if [ "${healthy}" -ne 1 ]; then
  log "ERROR: backend did not become healthy within ${BACKEND_BOOT_TIMEOUT_SECS}s."
  exit 1
fi
log "Backend is healthy. Starting Next.js on port ${FRONTEND_PORT}..."

# Start Next.js in the background so we can also watch the backend process.
# Whichever one exits first triggers shutdown of the other and propagates the
# exit code, so the platform sees a non-zero exit if either dies.
( cd frontend && exec npx next start -p "${FRONTEND_PORT}" -H 0.0.0.0 ) &
FRONTEND_PID=$!

cleanup() {
  if kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    log "Stopping frontend (pid ${FRONTEND_PID})..."
    kill "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if kill -0 "${BACKEND_PID}" 2>/dev/null; then
    log "Stopping backend (pid ${BACKEND_PID})..."
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Wait for either process to exit; whoever exits first wins and sets the code.
# Either process exiting (even cleanly with 0) is treated as a deploy failure
# so the platform marks the instance unhealthy and reschedules it.
set +e
wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
first_exit=$?
if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
  log "ERROR: backend exited (code ${first_exit}). Tearing down frontend."
elif ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
  log "ERROR: frontend exited (code ${first_exit}). Tearing down backend."
fi
# Coerce a clean (0) exit to non-zero so autoscale treats it as a failure —
# under normal operation neither process should ever exit on its own.
if [ "${first_exit}" -eq 0 ]; then
  first_exit=1
fi
exit "${first_exit}"
