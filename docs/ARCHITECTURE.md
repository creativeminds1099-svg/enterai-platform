# EnterAI Architecture

## Design rules

Two rules shaped every decision in this codebase:

1. **The registry has to be mechanized, not manually curated.** Collector
   jobs (`services/collectors/*`) run on a schedule and are the primary
   source of new/updated records. Manual entry through the Intake Wizard is
   supported but is treated as one more input to reconciliation, not the
   source of truth.
2. **Value and governance are first-class structured data**, not a
   description field. `ai_governance_record` and `ai_value_cost_metric` are
   dedicated tables with their own schemas, queried directly by the API —
   never parsed out of free text.

## Component map

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cloud Scheduler                                                     │
│  (one cron trigger per collector, staggered)                         │
└───────────────┬────────────────────────────────────────────────────┘
                 │ triggers
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  services/collectors/*  (Cloud Run Jobs, Python)                     │
│  agent_registry_collector · reasoning_engine_collector ·             │
│  cloud_asset_collector · iam_service_account_collector ·             │
│  runtime_log_collector                                               │
│                                                                        │
│  Each collector: calls one Google Cloud API family, normalizes the   │
│  response, writes append-only rows to its own raw_* BigQuery table.  │
│  Built on the shared agents/harness/base_agent.py so every collector │
│  gets the same retry, logging, and idempotency behavior for free.    │
└───────────────┬────────────────────────────────────────────────────┘
                 │ raw_* tables (BigQuery)
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  services/transform  (scheduled SQL, BigQuery scheduled query or     │
│  Cloud Run job)                                                       │
│  Normalizes raw rows into candidate canonical records: dedupes on     │
│  natural keys, maps source-specific enums to EnterAI's controlled     │
│  vocabulary, computes a content hash for change detection.            │
└───────────────┬────────────────────────────────────────────────────┘
                 │ candidate canonical rows
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  services/reconciler  (Antigravity reconciliation subagent)          │
│  declared_vs_deployed.py — is a deployed asset registered? is a       │
│    registered asset actually deployed/used?                           │
│  duplicate_detection.py — near-duplicate agents by name/prompt/tool   │
│    similarity                                                          │
│                                                                         │
│  Every candidate write is passed to agents/harness/approval_gate.py.  │
│  Routine facts land automatically; governance/ownership/lifecycle     │
│  changes are queued for human approval (see docs/ANTIGRAVITY.md).     │
└───────────────┬────────────────────────────────────────────────────┘
                 │ enterai_* canonical tables (BigQuery)
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  apps/api  (Node.js/TypeScript, Cloud Run service)                   │
│  REST endpoints over the canonical tables: initiatives, agents,       │
│  MCP servers, dependency graph traversal + blast-radius simulation,   │
│  governance queue, discovery status, executive dashboard rollups.     │
└───────────────┬────────────────────────────────────────────────────┘
                 │ HTTPS / JSON
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  apps/web  (React + Vite, served behind IAP/SSO)                     │
│  Command Center · Executive Ambition Dashboard · Agent Registry ·     │
│  Agent 360 Detail · Dependency Graph · Governance Workbench ·         │
│  Discovery Console · Intake Wizard                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Why a dependency graph, not just a table

A flat agent table can answer "what exists." It cannot answer "what breaks,
and who's affected, if this model or MCP server goes down" — which is the
question an SRE or architect actually needs answered during an incident.
`ai_dependency_edge` models every agent's relationships to the models,
prompts, tools, and data it depends on as first-class typed rows, so
`apps/api/src/services/graphService.ts` can do a bounded traversal from any
node and compute a blast radius (dependent agents, their owners, and their
value-at-risk from `ai_value_cost_metric`) instead of guessing.

BigQuery Graph is used for the traversal in production (see
`infra/terraform/bigquery.tf`); `graphService.ts` falls back to an in-memory
adjacency-list traversal over the same edge rows for local development so
the API works without a live BigQuery Graph deployment.

## Why collectors are separate jobs, not one script

Each Google Cloud API family (Agent Registry, Vertex Reasoning Engines,
Cloud Asset Inventory, IAM, Cloud Logging) has its own auth scope, pagination
behavior, rate limits, and failure modes. Splitting them into independently
schedulable, independently testable Cloud Run Jobs (rather than one
monolithic ingestion script) means a Cloud Logging outage doesn't block the
Agent Registry collector, and a new source family is just a new directory
under `services/collectors/` that reuses the shared harness.

## Approval gates

See `docs/ANTIGRAVITY.md` for the full human-in-the-loop model. In short:
discovery can *propose* facts freely; anything that would change governance
status, ownership, or production-readiness requires a recorded human
approval before it lands in a canonical table.
