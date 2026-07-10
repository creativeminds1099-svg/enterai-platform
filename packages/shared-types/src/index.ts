/**
 * Domain types shared between apps/api and apps/web. This is intentionally
 * a smaller, UI-facing subset of the full canonical schema in
 * infra/bigquery/schemas/ — apps/api/src/types/models.ts is the source of
 * truth for the backend's internal representation.
 */

export type LifecycleState =
  | "Ideation"
  | "Experimentation"
  | "Pilot"
  | "Scaling-Production"
  | "Retired"
  | "Quarantined";

export type RiskFlag = "Low" | "Medium" | "High";

export interface AgentSummary {
  agent_id: string;
  name: string;
  function_area?: string;
  lifecycle_state: LifecycleState;
  risk_flag: RiskFlag;
  owner_id?: string;
  production_ready: boolean;
}

export interface PortfolioRollup {
  total_agents: number;
  total_initiatives: number;
  forecast_value_usd_millions: number;
  actual_value_usd_millions: number;
  run_cost_usd_millions: number;
  by_stage: Record<string, number>;
  by_risk: Record<string, number>;
}
