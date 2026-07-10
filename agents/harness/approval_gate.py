"""Enforcement point for agents/policies/*.yaml.

Every write a collector or the reconciler wants to make is expressed as a
WriteProposal and passed to ApprovalGate.evaluate(). The gate checks the
proposal's entity_type and field names against collector_write_policy.yaml
(and, for governance-affecting fields, governance_approval_policy.yaml) and
returns a GateDecision: either the write is auto-applied, or it is queued
in the pending_approvals table for a human with the right role to accept or
reject via the Governance Workbench UI.

No collector or subagent in this repo writes to BigQuery directly — they
all go through this gate, which is what makes the policy files load-bearing
rather than documentation.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

POLICY_DIR = Path(__file__).resolve().parent.parent / "policies"


@dataclass
class WriteProposal:
    table: str
    entity_type: str
    entity_id: str
    fields: dict[str, Any]
    proposed_by: str
    run_id: str
    proposed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class GateDecision:
    proposal: WriteProposal
    auto_applied: bool
    reason: str
    requires_role: Optional[str] = None
    gated_fields: list[str] = field(default_factory=list)


class ApprovalGate:
    """Loads agents/policies/*.yaml once and evaluates proposals against it."""

    def __init__(self, policy_dir: Optional[Path] = None) -> None:
        self.policy_dir = policy_dir or POLICY_DIR
        self.collector_policy = self._load("collector_write_policy.yaml")
        self.governance_policy = self._load("governance_approval_policy.yaml")

    def _load(self, filename: str) -> dict:
        path = self.policy_dir / filename
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}

    def evaluate(self, proposal: WriteProposal) -> GateDecision:
        entity_rules = self.collector_policy.get("entities", {}).get(
            proposal.entity_type, {}
        )
        autonomous_fields = set(entity_rules.get("autonomous_fields", []))
        gated_fields_cfg = set(entity_rules.get("gated_fields", []))

        # Fields not explicitly listed either way default to gated — the
        # safe failure mode is "ask a human", not "write silently".
        touched = set(proposal.fields.keys())
        gated_touched = [
            f for f in touched if f in gated_fields_cfg or f not in autonomous_fields
        ]

        if not gated_touched:
            return GateDecision(
                proposal=proposal,
                auto_applied=True,
                reason=f"All fields ({sorted(touched)}) are autonomous for "
                f"{proposal.entity_type} per collector_write_policy.yaml.",
            )

        approver_role = self.governance_policy.get("default_approver_role", "governance_reviewer")
        for check in self.governance_policy.get("field_approver_overrides", []):
            if proposal.entity_type == check.get("entity_type") and any(
                f in gated_touched for f in check.get("fields", [])
            ):
                approver_role = check.get("approver_role", approver_role)
                break

        return GateDecision(
            proposal=proposal,
            auto_applied=False,
            reason=f"Fields {sorted(gated_touched)} require human approval "
            f"before landing in {proposal.table}.",
            requires_role=approver_role,
            gated_fields=sorted(gated_touched),
        )
