#!/usr/bin/env python3
"""Collector: Google Cloud Agent Registry (Preview).

Fetches agents, MCP servers, and endpoints for the configured project and
writes normalized rows to the three raw_google_agent_registry_* tables.
Runs as a Cloud Run Job on the schedule defined in
infra/terraform/scheduler.tf.
"""
from __future__ import annotations

import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))  # repo root on path

from services.collectors.common.bq_writer import write_raw_rows
from services.collectors.common.config import CollectorConfig
from services.collectors.common.gcp_clients import agent_registry_request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enterai.collectors.agent_registry")


def normalize_agent(cfg: CollectorConfig, run_id: str, raw: dict) -> dict:
    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "location": cfg.location,
        "agent_resource_name": raw.get("name", ""),
        "display_name": raw.get("displayName"),
        "description": raw.get("description"),
        "create_time": raw.get("createTime"),
        "update_time": raw.get("updateTime"),
        "framework": raw.get("framework"),
        "runtime_platform": raw.get("runtimePlatform"),
        "model_refs": raw.get("modelRefs", []),
        "mcp_server_refs": raw.get("mcpServerRefs", []),
        "endpoint_refs": raw.get("endpointRefs", []),
        "labels_json": _json(raw.get("labels", {})),
        "raw_payload_json": _json(raw),
    }


def normalize_mcp_server(cfg: CollectorConfig, run_id: str, raw: dict) -> dict:
    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "location": cfg.location,
        "mcp_server_resource_name": raw.get("name", ""),
        "display_name": raw.get("displayName"),
        "description": raw.get("description"),
        "create_time": raw.get("createTime"),
        "update_time": raw.get("updateTime"),
        "tool_spec_refs": raw.get("toolSpecRefs", []),
        "endpoint_refs": raw.get("endpointRefs", []),
        "risk_classification": raw.get("riskClassification"),
        "raw_payload_json": _json(raw),
    }


def normalize_endpoint(cfg: CollectorConfig, run_id: str, raw: dict) -> dict:
    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "location": cfg.location,
        "endpoint_resource_name": raw.get("name", ""),
        "display_name": raw.get("displayName"),
        "target_type": raw.get("targetType"),
        "target_resource_name": raw.get("targetResourceName"),
        "network_access": raw.get("networkAccess"),
        "create_time": raw.get("createTime"),
        "raw_payload_json": _json(raw),
    }


def _json(obj) -> str:
    import json

    return json.dumps(obj, default=str)


def run(cfg: CollectorConfig) -> None:
    run_id = str(uuid.uuid4())
    dataset = f"{cfg.project_id}.{cfg.bq_dataset_id}"

    for resource, normalizer, table in (
        ("agents", normalize_agent, "raw_google_agent_registry_agents"),
        ("mcpServers", normalize_mcp_server, "raw_google_agent_registry_mcp_servers"),
        ("endpoints", normalize_endpoint, "raw_google_agent_registry_endpoints"),
    ):
        try:
            payload = agent_registry_request(cfg.project_id, cfg.location, resource)
        except Exception:
            logger.exception("fetch.failed", extra={"resource": resource})
            continue

        items = payload.get(resource, [])
        rows = [normalizer(cfg, run_id, item) for item in items]
        write_raw_rows(f"{dataset}.{table}", rows, dry_run=cfg.dry_run)
        logger.info("resource.collected", extra={"resource": resource, "count": len(rows)})


if __name__ == "__main__":
    run(CollectorConfig.from_env())
