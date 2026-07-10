# EnterAI Data Model

EnterAI's canonical schema lives in BigQuery. Raw landing tables (one per
discovery source) are append-only and untouched by business logic; canonical
tables are the reconciled, deduplicated, governance-aware system of record
that the API and frontend actually read from.

## Canonical entities

| Entity | Table | Purpose |
|---|---|---|
| AI Initiative | `enterai_ai_initiative` | Top-level program/product grouping one or more agents around a business outcome. |
| AI Agent | `enterai_ai_agent` | A single deployed or in-development agent: runtime, framework, owner, lifecycle state. |
| MCP Server | `enterai_ai_mcp_server` | A registered MCP server exposing tools to one or more agents. |
| Connector / Tool / API | `enterai_ai_connector_tool_api` | Non-MCP tool integrations and internal/external APIs an agent calls. |
| Model | `enterai_ai_model` | A foundation or fine-tuned model referenced by an agent or prompt. |
| Prompt | `enterai_ai_prompt` | A versioned prompt/prompt-template asset. |
| Dataset / Vector Store | `enterai_ai_dataset_vector_store` | Data or embedding sources an agent reads from. |
| Dependency Edge | `enterai_ai_dependency_edge` | A typed relationship between any two of the above (see below). |
| Runtime Metric | `enterai_ai_runtime_metric` | Latency, cost, token usage, error rate — time-series, keyed to an agent. |
| Governance Record | `enterai_ai_governance_record` | Security review, responsible-AI review, DLP status, production-readiness gate. |
| Owner / Sponsor | `enterai_ai_owner_sponsor` | Accountable person/team for an initiative or agent. |
| Value / Cost Metric | `enterai_ai_value_cost_metric` | Forecast vs. actual value (revenue, NPS, efficiency) and run-cost baseline. |

JSON Schema (BigQuery table definition) for each of these lives in
`infra/bigquery/schemas/enterai_*.json`.

## Lifecycle states

Every `ai_initiative` and `ai_agent` record carries a `lifecycle_state`:

```
Ideation → Experimentation → Pilot → Scaling-Production → Retired
                                                  ↘ Quarantined
```

`Quarantined` is reachable from any state and is set automatically by the
reconciler when a governance record lapses (e.g. a required review expires)
or when duplicate detection flags a probable duplicate pending human
resolution.

## Relationship (dependency edge) types

`ai_dependency_edge` rows are typed using a fixed vocabulary so the
dependency graph and blast-radius analysis can reason about them
generically:

- `CONTAINS` — initiative contains agent
- `USES` — agent uses a model or prompt
- `CALLS` — agent calls an MCP server, connector, or API
- `CONSUMES` — agent consumes a dataset or vector store
- `PRODUCES` — agent produces a dataset (e.g. a derived feature store)
- `DEPENDS_ON` — generic infra/service dependency
- `OWNS` — owner/sponsor owns an initiative or agent
- `APPROVED_BY` — governance record approved by a reviewer/role
- `EXPOSES` — MCP server exposes a tool spec
- `MONITORED_BY` — agent monitored by a runtime metric stream

## Risk and governance vocabulary

- **Risk flags**: `Low`, `Medium`, `High` — derived from data sensitivity,
  autonomy level (read-only vs. write-capable/agentic action), and
  blast-radius of dependent systems.
- **Governance checks**: `security_review`, `responsible_ai_review`,
  `dlp_review` (data-loss-prevention / data classification), and
  `production_readiness_gate`. An agent cannot transition to
  `Scaling-Production` while any required check is `Not Started` or
  `Rejected`.
- **Platform ecosystems**: `vertex_ai`, `agent_engine`, `cloud_run`,
  `adk_prototype`, `third_party`, `other` — used to normalize collector
  output across sources.

## Raw landing tables

Each collector writes only to its own append-only raw table; nothing else
reads these directly:

- `raw_google_agent_registry_agents`, `raw_google_agent_registry_mcp_servers`,
  `raw_google_agent_registry_endpoints` — Google Cloud Agent Registry (Preview)
- `raw_vertex_reasoning_engines` — Vertex AI Agent Engine (Reasoning Engines API)
- `raw_cloud_assets` — Cloud Asset Inventory `searchAllResources`
- `raw_iam_service_accounts` — IAM service accounts and role bindings
- `raw_agent_logs` — Cloud Logging / trace events used for usage/runtime metrics

`services/transform/raw_to_canonical.sql` defines the transform from raw
tables into canonical tables; `services/reconciler` is what actually decides
whether a proposed canonical write lands automatically or needs a human
approval (see `docs/ANTIGRAVITY.md`).
