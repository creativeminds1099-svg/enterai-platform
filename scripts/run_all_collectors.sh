#!/usr/bin/env bash
# Runs every collector once, sequentially, against the GCP project in
# GOOGLE_CLOUD_PROJECT. Intended for manual/local testing; in production
# each collector runs independently on its own Cloud Scheduler cadence
# (see infra/terraform/scheduler.tf).
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT before running collectors.}"

cd "$(dirname "$0")/.."
pip install -r services/collectors/requirements.txt --quiet

for collector in agent_registry_collector reasoning_engine_collector cloud_asset_collector iam_service_account_collector runtime_log_collector; do
  echo "=== Running $collector ==="
  python3 "services/collectors/$collector/main.py"
done

echo "=== Running raw -> canonical transform ==="
python3 services/transform/run_transform.py

echo "=== Running reconciler ==="
python3 services/reconciler/main.py
