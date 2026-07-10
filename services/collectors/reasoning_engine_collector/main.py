#!/usr/bin/env python3
"""Collector: Vertex AI Agent Engine (Reasoning Engines API).

Deployed reasoning engines are one of the strongest "actually deployed"
signals the reconciler uses to catch shadow AI (an engine running with no
matching Agent Registry entry) and stale registrations (a registered agent
whose backing engine no longer exists).
"""
from __future__ import annotations

import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from services.collectors.common.bq_writer import write_raw_rows
from services.collectors.common.config import CollectorConfig
from services.collectors.common.gcp_clients import reasoning_engines_request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enterai.collectors.reasoning_engine")


def normalize(cfg: CollectorConfig, run_id: str, raw: dict) -> dict:
    import json

    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "location": cfg.location,
        "reasoning_engine_resource_name": raw.get("name", ""),
        "display_name": raw.get("displayName"),
        "description": raw.get("description"),
        "create_time": raw.get("createTime"),
        "update_time": raw.get("updateTime"),
        "class_methods_json": json.dumps(raw.get("classMethods", []), default=str),
        "deployed_model_refs": raw.get("deployedModelRefs", []),
        "service_account": raw.get("serviceAccount"),
        "raw_payload_json": json.dumps(raw, default=str),
    }


def run(cfg: CollectorConfig) -> None:
    run_id = str(uuid.uuid4())
    dataset = f"{cfg.project_id}.{cfg.bq_dataset_id}"

    try:
        payload = reasoning_engines_request(cfg.project_id, cfg.location)
    except Exception:
        logger.exception("fetch.failed")
        return

    items = payload.get("reasoningEngines", [])
    rows = [normalize(cfg, run_id, item) for item in items]
    write_raw_rows(f"{dataset}.raw_vertex_reasoning_engines", rows, dry_run=cfg.dry_run)
    logger.info("reasoning_engines.collected", extra={"count": len(rows)})


if __name__ == "__main__":
    run(CollectorConfig.from_env())
