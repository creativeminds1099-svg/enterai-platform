#!/usr/bin/env bash
# Starts the API and web frontend locally against fixture data (no GCP
# project required). Run from the repo root: ./scripts/dev_up.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
npm install --workspaces

echo "Starting API (fixtures mode) on :8080..."
(cd apps/api && ENTERAI_USE_FIXTURES=true npm run dev) &
API_PID=$!

echo "Starting web frontend on :5173..."
(cd apps/web && npm run dev) &
WEB_PID=$!

trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT
wait
