# Building EnterAI with Antigravity

EnterAI's two workstreams — the control-plane registry and the discovery/value
pipeline — are two products with different data-access patterns that needed
to behave like one platform. This doc describes the pieces of Google's
Antigravity agentic development platform this repo leans on, and how the
`agents/` directory maps to them.

## Cross-repository context (IDE)

The registry API (`apps/api`) and the discovery collectors
(`services/collectors`) share a single BigQuery schema
(`infra/bigquery/schemas/enterai_*.json`). Developing them inside the
Antigravity IDE with cross-repository project context meant the agent
generating a new API route could see the exact schema a collector was
writing to in the same session, instead of two design docs drifting apart.
There is no separate "API schema" and "collector schema" in this repo by
design — both read `infra/bigquery/schemas/` as the single source of truth.

## Scaffolded, scoped collector jobs (CLI)

Each directory under `services/collectors/` is a small, independently
runnable unit: one Google Cloud API family in, one raw BigQuery table out.
That shape — rather than one large ingestion script — is what the
Antigravity CLI scaffolds by default (`antigravity generate collector
<source-name>`), and it's why adding a sixth data source later is a matter of
adding a sixth directory that imports `agents/harness/base_agent.py`, not
editing a shared 2,000-line script.

## Shared agent harness (SDK)

`agents/harness/base_agent.py` is the shared harness both workstreams draw
from — the piece the Antigravity SDK is built around. It gives every
collector and the reconciler the same:

- Structured logging + run metadata (`run_id`, `source`, `started_at`)
- Retry/backoff around the underlying Google API call
- A single `propose_write()` method that every collector and the reconciler
  call instead of writing to BigQuery directly

`agents/harness/reconciliation_agent.py` is the subagent that reconciles
**declared** (registry) vs. **deployed** (cloud discovery) vs. **used**
(runtime telemetry) state — the logic that used to need writing twice (once
for the registry team's duplicate-detection needs, once for the discovery
team's drift-detection needs) collapses into one shared subagent because both
workstreams call the same harness.

## Human-in-the-loop approval gate (Antigravity 2.0)

`agents/harness/approval_gate.py` is the enforcement point. Every proposed
write from a collector or the reconciler passes through it along with the
policies in `agents/policies/`:

- `collector_write_policy.yaml` — defines which fields on which entities a
  collector may write **autonomously** (e.g. an agent's observed runtime
  environment, a newly discovered MCP endpoint) versus which fields always
  require a queued approval (e.g. `lifecycle_state`, `owner_id`,
  `governance_status`).
- `governance_approval_policy.yaml` — defines who is allowed to approve a
  queued governance-affecting change (by role, not by name — this repo has
  no real employee data) and what evidence must be attached (a completed
  `security_review`, `responsible_ai_review`, and `dlp_review` record) before
  an agent can transition to `Scaling-Production`.

This is the direct implementation of Antigravity 2.0's human-in-the-loop
model: automation is allowed to move fast on facts, and required to ask
permission before it touches anything a human is accountable for.

## What's illustrative vs. real in this repo

The collectors call real (Preview-stage) Google Cloud APIs — Agent Registry,
Vertex AI Agent Engine, Cloud Asset Inventory, IAM, Cloud Logging — and will
run against any GCP project with those APIs enabled and the right IAM roles
(see `infra/terraform/iam.tf`). The Antigravity CLI/SDK invocations referenced
above are represented here as the harness/policy pattern they produce rather
than as a vendored CLI binary, since that tooling is Google's and not
something to redistribute in this repository.
