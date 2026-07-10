#!/usr/bin/env python3
"""Collector: Cloud Logging / runtime telemetry.

Runs most frequently (every 15 minutes by default, see
infra/terraform/scheduler.tf) since usage/latency/cost signals are the
freshest-decaying input to the reconciler's "actually used" determination
and to the Executive Ambition Dashboard's run-cost baseline.
"""
from __future__ import annotations

import logging
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from services.collectors.common.bq_writer import write_raw_rows
from services.collectors.common.config import CollectorConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enterai.collectors.runtime_log")

# Structured log filter: agent/reasoning-engine request logs emit these
# fields via OpenTelemetry instrumentation in the agent runtime itself.
LOG_FILTER = (
    'logName:"enterai-agent-invocations" '
    'AND jsonPayload.source_resource_name!=""'
)

LOOKBACK_MINUTES = 20


def normalize(cfg: CollectorConfig, run_id: str, entry) -> dict:
    import json

    payload = dict(entry.payload) if isinstance(entry.payload, dict) else {}
    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "log_time": entry.timestamp.isoformat() if entry.timestamp else None,
        "source_resource_name": payload.get("source_resource_name", ""),
        "severity": str(entry.severity) if entry.severity else None,
        "trace_id": entry.trace,
        "latency_ms": payload.get("latency_ms"),
        "input_tokens": payload.get("input_tokens"),
        "output_tokens": payload.get("output_tokens"),
        "estimated_cost_usd": payload.get("estimated_cost_usd"),
        "status_code": payload.get("status_code"),
        "caller_identity": payload.get("caller_identity"),
        "raw_payload_json": json.dumps(payload, default=str),
    }


def run(cfg: CollectorConfig) -> None:
    run_id = str(uuid.uuid4())
    dataset = f"{cfg.project_id}.{cfg.bq_dataset_id}"

    from services.collectors.common.gcp_clients import logging_client

    client = logging_client()
    since = datetime.now(timezone.utc) - timedelta(minutes=LOOKBACK_MINUTES)
    filter_str = f'{LOG_FILTER} AND timestamp>="{since.isoformat()}"'

    rows = []
    try:
        for entry in client.list_entries(filter_=filter_str, page_size=500):
            rows.append(normalize(cfg, run_id, entry))
    except Exception:
        logger.exception("list_entries.failed")
        return

    write_raw_rows(f"{dataset}.raw_agent_logs", rows, dry_run=cfg.dry_run)
    logger.info("log_entries.collected", extra={"count": len(rows)})


if __name__ == "__main__":
    run(CollectorConfig.from_env())
