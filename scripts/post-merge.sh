#!/usr/bin/env bash
# Post-merge setup for Tarsheeh.cv.
# Runs after a task is merged. Stdin is closed, so use non-interactive flags.
set -euo pipefail

echo "[post-merge] python deps"
if [ -f backend/requirements.txt ]; then
  if command -v uv >/dev/null 2>&1; then
    uv pip install --prefix .pythonlibs --quiet -r backend/requirements.txt
  else
    python -m pip install --quiet --disable-pip-version-check --break-system-packages -r backend/requirements.txt
  fi
fi

echo "[post-merge] node deps"
if [ -f frontend/package-lock.json ]; then
  (cd frontend && npm ci --silent --no-audit --no-fund)
elif [ -f frontend/package.json ]; then
  (cd frontend && npm install --silent --no-audit --no-fund)
fi

echo "[post-merge] done"
