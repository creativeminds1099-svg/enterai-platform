# EnterAI — Enterprise AI Control Plane

EnterAI is a living registry, dependency graph, and executive value/governance
dashboard for every AI initiative, agent, MCP server, model, prompt, and
dataset in an enterprise. It replaces the "spreadsheet nobody fully trusts"
with a mechanized system of record that reconciles what's **declared**
(registry), what's **deployed** (cloud discovery), and what's **actually
used** (runtime telemetry) — continuously, not once a quarter.

This repository contains the reference implementation of the two workstreams
described in the accompanying design docs:

1. **Enterprise AI Control Plane** — canonical registries (initiatives,
   agents, MCP servers, connectors, models, prompts, datasets), a dependency
   graph, and a governance workflow engine.
2. **Autonomous AI Registry Discovery, Value Scoring & Executive Ambition
   Dashboard** — scheduled collector jobs that scan Google Cloud for AI
   assets, a reconciliation subagent that flags duplicates and drift, and a
   portfolio-level dashboard scored against revenue, NPS, and efficiency
   targets.

The build is scaffolded around an **Antigravity-flavored** multi-agent
architecture: independent, scoped collector agents that write through a
shared harness with declarative safety policies, and a human-in-the-loop
approval gate for anything that touches governance or ownership state. See
[`docs/ANTIGRAVITY.md`](docs/ANTIGRAVITY.md).

> This is a from-scratch reference implementation built for an internal
> Agentic Architect Sprint. Sample data, project IDs, and org names in this
> repo are all illustrative placeholders — swap in your own GCP project(s)
> and IAM before running anything against real infrastructure.

## Repository layout

```
enterai-platform/
├── apps/
│   ├── web/                 React + Vite frontend (Command Center, Registry,
│   │                        Dependency Graph, Governance, Discovery, etc.)
│   └── api/                 Node.js/TypeScript backend API (Cloud Run service)
├── services/
│   ├── collectors/          One scoped Cloud Run Job per discovery source
│   │   ├── agent_registry_collector/      Google Cloud Agent Registry
│   │   ├── reasoning_engine_collector/    Vertex AI Agent Engine
│   │   ├── cloud_asset_collector/         Cloud Asset Inventory
│   │   ├── iam_service_account_collector/ IAM service accounts & bindings
│   │   └── runtime_log_collector/         Cloud Logging / trace telemetry
│   ├── reconciler/          Declared-vs-deployed-vs-used reconciliation
│   │                        subagent + duplicate detection
│   └── transform/           Raw landing tables → canonical registry tables
├── agents/
│   ├── harness/             Shared Antigravity-style agent harness
│   │                        (base agent, approval gate, reconciliation agent)
│   └── policies/            Declarative YAML policies: what a collector may
│                             write autonomously vs. what requires approval
├── infra/
│   ├── terraform/           BigQuery, Cloud Run, Cloud Scheduler, IAM
│   └── bigquery/schemas/    JSON schemas for raw + canonical tables
├── packages/shared-types/   TypeScript types shared by api and web
├── scripts/                 Local dev, seeding, and collector run scripts
└── docs/                    Architecture, data model, Antigravity notes
```

## Data model

Everything in EnterAI hangs off ten canonical entities — initiative, agent,
MCP server, connector/tool/API, model, prompt, dataset/vector store,
dependency edge, runtime metric, and governance record — plus owner/sponsor
and value/cost metrics. Full definitions, lifecycle states, and relationship
types are in [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Architecture

Discovery flows one direction, registry reads flow the other:

```
Cloud Scheduler ──▶ Cloud Run Job (collector) ──▶ raw_* BigQuery tables
                                                        │
                                            services/transform (SQL)
                                                        ▼
                                          canonical enterai_* tables
                                                        │
                                       services/reconciler (Antigravity
                                       reconciliation subagent + approval
                                       gate for governance-affecting writes)
                                                        │
                                                        ▼
                                        apps/api  (Cloud Run service)
                                                        │
                                                        ▼
                                              apps/web (React frontend)
```

Full write-up: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Getting started (local dev)

Prerequisites: Node.js 20+, Python 3.11+, a GCP project with BigQuery enabled,
and `gcloud` authenticated locally if you want collectors to hit real APIs
(they also run fully offline against seeded sample data).

```bash
# 1. Install dependencies
cd apps/api && npm install && cd ../web && npm install && cd ../..

# 2. Seed sample BigQuery-shaped data into local JSON fixtures
python3 scripts/seed_sample_data.py

# 3. Start the API (reads from BigQuery in prod, local fixtures in dev)
cd apps/api && npm run dev

# 4. Start the frontend
cd apps/web && npm run dev
```

To run a real collector against a GCP project:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
python3 services/collectors/agent_registry_collector/main.py
```

Deploying the full stack (BigQuery datasets, Cloud Run services, Cloud
Scheduler jobs, IAM) is handled by Terraform in `infra/terraform/` — see that
directory's comments for the apply order.

## Governance by design

No collector writes directly to a canonical table. Every write passes through
`agents/harness/approval_gate.py`, which checks the record against
`agents/policies/*.yaml`: routine discovery facts (an agent's runtime, a new
MCP server endpoint) can land automatically; anything touching ownership,
lifecycle/production-readiness, or governance status is queued for human
approval before it's final. See `docs/ANTIGRAVITY.md`.

## Status

Actively mid-build. Registry and dashboard read paths are functional against
seeded data; collectors are written against the (Preview) Google Cloud Agent
Registry API and Vertex AI Agent Engine API and will need to be pointed at a
project with those APIs enabled. Contributions and issues welcome.

## License

MIT — see [LICENSE](LICENSE).
