"""Shared Antigravity-style agent harness used by every EnterAI collector
and by the reconciliation subagent. See docs/ANTIGRAVITY.md.
"""
from .base_agent import BaseAgent, RunContext
from .approval_gate import ApprovalGate, WriteProposal, GateDecision
from .reconciliation_agent import ReconciliationAgent

__all__ = [
    "BaseAgent",
    "RunContext",
    "ApprovalGate",
    "WriteProposal",
    "GateDecision",
    "ReconciliationAgent",
]
