-- Raw landing tables -> candidate canonical records.
-- Runs as a scheduled BigQuery query (or a lightweight Cloud Run Job that
-- issues these statements) between the collectors and the reconciler.
-- Declared @dataset as a placeholder to be substituted at deploy time.

-- Agents: fold the most recent raw Agent Registry row per resource into a
-- staging table the reconciler reads via declared_vs_deployed.load_registry_agents.
CREATE OR REPLACE TABLE `@dataset.stg_agent_registry_latest` AS
SELECT
  agent_resource_name,
  ANY_VALUE(display_name) AS display_name,
  ANY_VALUE(description) AS description,
  ANY_VALUE(framework) AS framework,
  ANY_VALUE(runtime_platform) AS runtime_platform,
  ANY_VALUE(model_refs) AS model_refs,
  ANY_VALUE(mcp_server_refs) AS mcp_server_refs,
  ANY_VALUE(endpoint_refs) AS endpoint_refs,
  MAX(collected_at) AS last_seen_at
FROM `@dataset.raw_google_agent_registry_agents`
QUALIFY ROW_NUMBER() OVER (PARTITION BY agent_resource_name ORDER BY collected_at DESC) = 1
GROUP BY agent_resource_name;

-- Deployed resources considered "AI-relevant" for shadow-AI detection.
CREATE OR REPLACE TABLE `@dataset.stg_deployed_ai_resources` AS
SELECT DISTINCT
  asset_name AS resource_name,
  asset_type,
  location,
  state
FROM `@dataset.raw_cloud_assets`
WHERE asset_type IN (
  'run.googleapis.com/Service',
  'aiplatform.googleapis.com/ReasoningEngine'
);

-- 7-day rolling usage per resource, feeding runtime_metric + reconciler.
CREATE OR REPLACE TABLE `@dataset.stg_runtime_usage_7d` AS
SELECT
  source_resource_name AS resource_name,
  COUNT(*) AS invocation_count,
  APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] AS p50_latency_ms,
  APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)] AS p95_latency_ms,
  SAFE_DIVIDE(COUNTIF(status_code NOT IN ('OK', '200')), COUNT(*)) AS error_rate,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(estimated_cost_usd) AS estimated_cost_usd,
  COUNT(DISTINCT caller_identity) AS unique_callers
FROM `@dataset.raw_agent_logs`
WHERE log_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY source_resource_name;

-- services/reconciler/main.py reads these three staging tables (plus the
-- existing enterai_ai_agent canonical table) rather than querying raw_*
-- tables directly, so the transform step is the only place collector
-- output shapes are normalized before reconciliation logic runs.
