#!/usr/bin/env python3
"""Collector: IAM service accounts and role bindings.

Used to answer "what identity does this agent run as, and what can it
actually touch" -- a required input to computing an agent's risk_flag and
to catching over-privileged service accounts backing low-risk agents.
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
logger = logging.getLogger("enterai.collectors.iam_service_account")


def list_service_accounts(project_id: str):
    from googleapiclient.discovery import build

    service = build("iam", "v1", cache_discovery=False)
    request = service.projects().serviceAccounts().list(name=f"projects/{project_id}")
    accounts = []
    while request is not None:
        response = request.execute()
        accounts.extend(response.get("accounts", []))
        request = service.projects().serviceAccounts().list_next(
            previous_request=request, previous_response=response
        )
    return accounts


def get_iam_policy_roles(project_id: str, member_email: str) -> list[str]:
    from googleapiclient.discovery import build

    crm = build("cloudresourcemanager", "v1", cache_discovery=False)
    policy = crm.projects().getIamPolicy(resource=project_id, body={}).execute()
    member = f"serviceAccount:{member_email}"
    return [
        binding["role"]
        for binding in policy.get("bindings", [])
        if member in binding.get("members", [])
    ]


def normalize(cfg: CollectorConfig, run_id: str, account: dict, roles: list[str]) -> dict:
    import json

    return {
        "raw_id": str(uuid.uuid4()),
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "gcp_project_id": cfg.project_id,
        "service_account_email": account.get("email", ""),
        "display_name": account.get("displayName"),
        "disabled": account.get("disabled", False),
        "bound_roles": roles,
        "used_by_resource_refs": [],  # filled in by the reconciler, cross-referencing raw_cloud_assets
        "create_time": None,
        "raw_payload_json": json.dumps(account, default=str),
    }


def run(cfg: CollectorConfig) -> None:
    run_id = str(uuid.uuid4())
    dataset = f"{cfg.project_id}.{cfg.bq_dataset_id}"

    try:
        accounts = list_service_accounts(cfg.project_id)
    except Exception:
        logger.exception("list_service_accounts.failed")
        return

    rows = []
    for account in accounts:
        try:
            roles = get_iam_policy_roles(cfg.project_id, account.get("email", ""))
        except Exception:
            logger.warning("get_iam_policy_roles.failed", extra={"account": account.get("email")})
            roles = []
        rows.append(normalize(cfg, run_id, account, roles))

    write_raw_rows(f"{dataset}.raw_iam_service_accounts", rows, dry_run=cfg.dry_run)
    logger.info("service_accounts.collected", extra={"count": len(rows)})


if __name__ == "__main__":
    run(CollectorConfig.from_env())
