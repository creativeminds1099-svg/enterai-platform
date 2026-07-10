"""Base class for every EnterAI collector and subagent.

Provides the run lifecycle, structured logging, retry/backoff, and the
single propose_write() entry point that routes every table write through
the ApprovalGate. No subclass should ever call a BigQuery client directly —
that indirection is what makes agents/policies/*.yaml enforceable instead
of advisory.
"""
from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from .approval_gate import ApprovalGate, WriteProposal


@dataclass
class RunContext:
    """Metadata attached to every run of every agent for traceability."""

    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source: str = "unknown"
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    project_id: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "source": self.source,
            "started_at": self.started_at.isoformat(),
            "project_id": self.project_id,
        }


class BaseAgent:
    """Common harness for collectors and subagents.

    Subclasses implement `collect()` (fetch + normalize from a source) and
    call `self.propose_write(...)` for each candidate row instead of writing
    to BigQuery themselves.
    """

    #: Override in subclasses, e.g. "agent_registry_collector"
    source_name: str = "base_agent"

    #: Max attempts for the underlying source API call before giving up.
    max_retries: int = 3
    backoff_seconds: float = 2.0

    def __init__(self, project_id: str, gate: Optional[ApprovalGate] = None) -> None:
        self.project_id = project_id
        self.gate = gate or ApprovalGate()
        self.logger = logging.getLogger(f"enterai.agents.{self.source_name}")
        self.ctx = RunContext(source=self.source_name, project_id=project_id)

    # -- lifecycle -----------------------------------------------------

    def run(self) -> "RunSummary":
        self.logger.info("run.start", extra=self.ctx.as_dict())
        proposals: list[WriteProposal] = []
        error: Optional[str] = None
        try:
            proposals = list(self.with_retries(self.collect))
        except Exception as exc:  # noqa: BLE001 - surfaced in RunSummary
            error = str(exc)
            self.logger.exception("run.failed")

        decisions = [self.gate.evaluate(p) for p in proposals]
        auto_applied = sum(1 for d in decisions if d.auto_applied)
        queued = sum(1 for d in decisions if not d.auto_applied)

        summary = RunSummary(
            run_id=self.ctx.run_id,
            source=self.source_name,
            proposals=len(proposals),
            auto_applied=auto_applied,
            queued_for_approval=queued,
            error=error,
        )
        self.logger.info("run.complete", extra=summary.__dict__)
        return summary

    def collect(self):  # pragma: no cover - implemented by subclasses
        """Yield WriteProposal objects. Must be implemented by subclasses."""
        raise NotImplementedError

    # -- helpers ---------------------------------------------------------

    def propose_write(
        self,
        table: str,
        entity_type: str,
        entity_id: str,
        fields: dict[str, Any],
    ) -> WriteProposal:
        """Build a WriteProposal tagged with this run's provenance."""
        return WriteProposal(
            table=table,
            entity_type=entity_type,
            entity_id=entity_id,
            fields=fields,
            proposed_by=self.source_name,
            run_id=self.ctx.run_id,
        )

    def with_retries(self, fn: Callable[[], Any]) -> Any:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return fn()
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                self.logger.warning(
                    "attempt.failed", extra={"attempt": attempt, "error": str(exc)}
                )
                if attempt < self.max_retries:
                    time.sleep(self.backoff_seconds * attempt)
        assert last_exc is not None
        raise last_exc


@dataclass
class RunSummary:
    run_id: str
    source: str
    proposals: int
    auto_applied: int
    queued_for_approval: int
    error: Optional[str] = None
