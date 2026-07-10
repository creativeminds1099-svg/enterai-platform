"""Builds the three input sets the ReconciliationAgent compares:
registered agents (declared), discovered cloud resources (deployed), and
per-resource invocation counts (used). Pulls from BigQuery in production;
accepts pre-fetched lists for local/dry-run use (see scripts/seed_sample_data.py).
"""
from __future__ import annotations

from typing import Optional


def load_registry_agents(bq_client, dataset: str) -> list[dict]:
    query = f"SELECT * FROM `{dataset}.enterai_ai_agent`"
    return [dict(row) for row in bq_client.query(query).result()]


def load_discovered_resources(bq_client, dataset: str) -> list[dict]:
    query = f"""
        SELECT DISTINCT asset_name AS resource_name, asset_type, location
        FROM `{dataset}.raw_cloud_assets`
        WHERE asset_type IN (
          'run.googleapis.com/Service',
          'aiplatform.googleapis.com/ReasoningEngine'
        )
    """
    return [dict(row) for row in bq_client.query(query).result()]


def load_usage_by_resource(bq_client, dataset: str) -> dict[str, int]:
    query = f"""
        SELECT source_resource_name AS resource_name, COUNT(*) AS invocations
        FROM `{dataset}.raw_agent_logs`
        WHERE log_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY source_resource_name
    """
    return {row["resource_name"]: row["invocations"] for row in bq_client.query(query).result()}
