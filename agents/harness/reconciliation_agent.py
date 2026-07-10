"""Reconciliation subagent: declared (registry) vs. deployed (cloud
discovery) vs. used (runtime telemetry).

Both EnterAI workstreams — the control-plane registry and the discovery/
value pipeline — need this same logic, so it lives once in the shared
harness rather than being written twice. See docs/ANTIGRAVITY.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .base_agent import BaseAgent
from .approval_gate import WriteProposal


@dataclass
class ReconciliationFinding:
    agent_id: str
    finding_type: str  # declared_only | deployed_undeclared | duplicate_candidate | stale
    detail: str
    confidence: float


class ReconciliationAgent(BaseAgent):
    """Compares canonical registry rows against raw discovery rows and
    produces WriteProposal updates (declared_only / deployed_undeclared
    flags) plus ReconciliationFinding records surfaced in the Discovery
    Console and Governance Workbench.
    """

    source_name = "reconciliation_agent"

    def __init__(self, project_id: str, registry_agents: list[dict], discovered_resources: list[dict], usage_by_resource: dict[str, int], **kwargs):
        super().__init__(project_id, **kwargs)
        self.registry_agents = registry_agents
        self.discovered_resources = discovered_resources
        self.usage_by_resource = usage_by_resource

    def collect(self) -> Iterable[WriteProposal]:
        registry_by_resource = {
            a.get("gcp_resource_name"): a for a in self.registry_agents if a.get("gcp_resource_name")
        }
        discovered_by_resource = {r["resource_name"]: r for r in self.discovered_resources}

        # Declared but never observed deployed.
        for resource_name, agent in registry_by_resource.items():
            if resource_name not in discovered_by_resource:
                yield self.propose_write(
                    table="enterai_ai_agent",
                    entity_type="agent",
                    entity_id=agent["agent_id"],
                    fields={"declared_only": True},
                )

        # Deployed but never registered — shadow AI candidate. This always
        # requires human approval before an agent record is created, since
        # entity creation implies ownership, which is a gated field.
        for resource_name, resource in discovered_by_resource.items():
            if resource_name not in registry_by_resource:
                yield self.propose_write(
                    table="enterai_ai_agent",
                    entity_type="agent",
                    entity_id=f"shadow::{resource_name}",
                    fields={
                        "declared_only": False,
                        "deployed_undeclared": True,
                        "gcp_resource_name": resource_name,
                        "lifecycle_state": "Ideation",
                        "owner_id": None,  # unknown -> forces approval routing
                    },
                )

        # Registered and deployed but zero observed invocations in the
        # telemetry window -> flag as a retirement candidate.
        for resource_name, agent in registry_by_resource.items():
            if resource_name in discovered_by_resource and self.usage_by_resource.get(resource_name, 0) == 0:
                yield self.propose_write(
                    table="enterai_ai_agent",
                    entity_type="agent",
                    entity_id=agent["agent_id"],
                    fields={"lifecycle_state": "Quarantined"},
                )

    def find_duplicates(self, similarity_fn, threshold: float = 0.82) -> list[ReconciliationFinding]:
        """Pairwise-compare registered agents using a caller-supplied
        similarity function (e.g. over name + prompt + tool-dependency
        vectors) and return candidates above `threshold`. Kept separate from
        collect() because duplicate detection is O(n^2) and typically run
        on a slower cadence than the main reconciliation pass.
        """
        findings: list[ReconciliationFinding] = []
        agents = self.registry_agents
        for i in range(len(agents)):
            for j in range(i + 1, len(agents)):
                score = similarity_fn(agents[i], agents[j])
                if score >= threshold:
                    findings.append(
                        ReconciliationFinding(
                            agent_id=agents[i]["agent_id"],
                            finding_type="duplicate_candidate",
                            detail=f"Similarity {score:.2f} with {agents[j]['agent_id']}",
                            confidence=score,
                        )
                    )
        return findings
