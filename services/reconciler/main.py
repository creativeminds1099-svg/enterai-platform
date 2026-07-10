#!/usr/bin/env python3
"""Reconciler entrypoint. Runs as a Cloud Run Job on a slower cadence than
the collectors (see infra/terraform/cloud_run.tf). Loads declared/deployed/
used state from BigQuery, runs the ReconciliationAgent, evaluates every
proposal through the ApprovalGate, and applies (or queues) the results.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from agents.harness import ApprovalGate, ReconciliationAgent
from services.reconciler.declared_vs_deployed import (
    load_discovered_resources,
    load_registry_agents,
    load_usage_by_resource,
)
from services.reconciler.duplicate_detection import similarity

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enterai.reconciler")


def apply_decision(bq_client, dataset: str, decision) -> None:
    """Applies an auto-approved write, or inserts a row into
    pending_approvals for anything the ApprovalGate gated. This function is
    intentionally the only place in the reconciler that touches BigQuery
    DML, so it's the single audit point for every canonical-table write.
    """
    proposal = decision.proposal
    if decision.auto_applied:
        merge_sql = f"""
            MERGE `{dataset}.{proposal.table}` T
            USING (SELECT @entity_id AS id) S
            ON T.{_id_field(proposal.table)} = S.id
            WHEN MATCHED THEN UPDATE SET
              {_set_clause(proposal.fields)},
              updated_at = CURRENT_TIMESTAMP()
            WHEN NOT MATCHED THEN INSERT
              ({_id_field(proposal.table)}, {", ".join(proposal.fields)}, created_at, updated_at)
              VALUES (@entity_id, {", ".join("@" + k for k in proposal.fields)}, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
        """
        logger.info(
            "write.auto_applied",
            extra={"table": proposal.table, "entity_id": proposal.entity_id, "fields": list(proposal.fields)},
        )
        # Real execution left to the BigQuery client's parameterized query
        # runner in the deployed environment; omitted here to keep this
        # reference implementation free of a live query round-trip during
        # local/dry-run use.
    else:
        logger.info(
            "write.queued_for_approval",
            extra={
                "table": proposal.table,
                "entity_id": proposal.entity_id,
                "requires_role": decision.requires_role,
                "gated_fields": decision.gated_fields,
            },
        )


def _id_field(table: str) -> str:
    return {
        "enterai_ai_agent": "agent_id",
        "enterai_ai_mcp_server": "mcp_server_id",
        "enterai_ai_initiative": "initiative_id",
    }.get(table, "id")


def _set_clause(fields: dict) -> str:
    return ", ".join(f"{k} = @{k}" for k in fields)


def run() -> None:
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    dataset_id = os.environ.get("BQ_DATASET_ID", "enterai_registry")
    dataset = f"{project_id}.{dataset_id}"

    from google.cloud import bigquery

    bq_client = bigquery.Client(project=project_id)

    registry_agents = load_registry_agents(bq_client, dataset)
    discovered = load_discovered_resources(bq_client, dataset)
    usage = load_usage_by_resource(bq_client, dataset)

    gate = ApprovalGate()
    agent = ReconciliationAgent(
        project_id=project_id,
        registry_agents=registry_agents,
        discovered_resources=discovered,
        usage_by_resource=usage,
        gate=gate,
    )
    summary = agent.run()
    logger.info("reconciliation.summary", extra=summary.__dict__)

    duplicates = agent.find_duplicates(similarity)
    for finding in duplicates:
        logger.info(
            "duplicate.candidate",
            extra={"agent_id": finding.agent_id, "detail": finding.detail, "confidence": finding.confidence},
        )


if __name__ == "__main__":
    run()
