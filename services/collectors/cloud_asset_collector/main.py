#!/usr/bin/env python3
"""Collector: Cloud Asset Inventory.

Broad sweep across asset types relevant to AI workloads (Cloud Run
services/jobs, Vertex AI resources, Pub/Sub topics feeding agent pipelines).
This is the collector most responsible for catching resources that exist in
the cloud but were never declared anywhere -- the raw material for the
reconciler's deployed_undeclared flag.
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enterai.collectors.cloud_asset")

ASSET_TYPES = [
    "run.googleapis.com/Service",
    "run.googleapis.com/Job",
    "aiplatform.googleapis.com/ReasoningEngine",
    "aiplatform.googleapis.com/Endpoint",
    "pubsub.googleapis.com/Topic",
]


def normalize(cfg: CollectorConfig, run_id: str, resource) -> dict:
    import json

    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "asset_name": resource.name,
        "asset_type": resource.asset_type,
        "display_name": getattr(resource, "display_name", None),
        "location": getattr(resource, "location", None),
        "state": getattr(resource, "state", None),
        "labels_json": json.dumps(dict(getattr(resource, "labels", {}) or {})),
        "create_time": None,
        "update_time": None,
        "raw_payload_json": json.dumps(
            {"name": resource.name, "asset_type": resource.asset_type}, default=str
        ),
    }


def run(cfg: CollectorConfig) -> None:
    run_id = str(uuid.uuid4())
    dataset = f"{cfg.project_id}.{cfg.bq_dataset_id}"

    from services.collectors.common.gcp_clients import asset_client

    client = asset_client()
    scope = f"projects/{cfg.project_id}"

    rows = []
    try:
        results = client.search_all_resources(
            request={"scope": scope, "asset_types": ASSET_TYPES}
        )
        for resource in results:
            rows.append(normalize(cfg, run_id, resource))
    except Exception:
        logger.exception("search_all_resources.failed")
        return

    write_raw_rows(f"{dataset}.raw_cloud_assets", rows, dry_run=cfg.dry_run)
    logger.info("assets.collected", extra={"count": len(rows)})


if __name__ == "__main__":
    run(CollectorConfig.from_env())
