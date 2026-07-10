export type LifecycleState =
  | "Ideation"
  | "Experimentation"
  | "Pilot"
  | "Scaling-Production"
  | "Retired"
  | "Quarantined";

export type RiskFlag = "Low" | "Medium" | "High";

export type GovernanceCheckType =
  | "security_review"
  | "responsible_ai_review"
  | "dlp_review"
  | "production_readiness_gate";

export type GovernanceStatus = "Not Started" | "In Review" | "Approved" | "Rejected" | "Expired";

export type RelationshipType =
  | "CONTAINS"
  | "USES"
  | "CALLS"
  | "CONSUMES"
  | "PRODUCES"
  | "DEPENDS_ON"
  | "OWNS"
  | "APPROVED_BY"
  | "EXPOSES"
  | "MONITORED_BY";

export interface Initiative {
  initiative_id: string;
  name: string;
  description?: string;
  department?: string;
  lifecycle_state: LifecycleState;
  owner_id?: string;
  agent_ids: string[];
}

export interface Agent {
  agent_id: string;
  initiative_id?: string;
  name: string;
  description?: string;
  function_area?: string;
  owner_id?: string;
  lifecycle_state: LifecycleState;
  risk_flag: RiskFlag;
  framework?: string;
  runtime_platform?: string;
  model_ids: string[];
  prompt_ids: string[];
  mcp_server_ids: string[];
  connector_ids: string[];
  dataset_ids: string[];
  production_ready: boolean;
  repo_url?: string;
  gcp_resource_name?: string;
  declared_only: boolean;
  deployed_undeclared: boolean;
  duplicate_of_agent_id?: string | null;
  value_forecast_usd_millions?: number;
  run_cost_usd_millions?: number;
}

export interface McpServer {
  mcp_server_id: string;
  name: string;
  description?: string;
  owner_id?: string;
  lifecycle_state: LifecycleState;
  tool_spec_refs: string[];
  risk_flag: RiskFlag;
  consuming_agent_ids: string[];
}

export interface DependencyEdge {
  edge_id: string;
  from_entity_type: string;
  from_entity_id: string;
  to_entity_type: string;
  to_entity_id: string;
  relationship_type: RelationshipType;
  discovered_by?: string;
}

export interface GovernanceRecord {
  governance_record_id: string;
  agent_id: string;
  check_type: GovernanceCheckType;
  status: GovernanceStatus;
  reviewer_role?: string;
  evidence_url?: string;
  decided_at?: string;
  expires_at?: string;
}

export interface ValueCostMetric {
  value_metric_id: string;
  entity_type: "initiative" | "agent";
  entity_id: string;
  metric_type: "revenue_growth" | "nps_improvement" | "efficiency_gain" | "run_cost";
  baseline_value?: number;
  forecast_value?: number;
  actual_value?: number;
  unit?: string;
  pivot_rule?: "scale" | "tune" | "retire";
}

export interface DiscoveryFinding {
  agent_id: string;
  finding_type: "declared_only" | "deployed_undeclared" | "duplicate_candidate" | "stale";
  detail: string;
  confidence: number;
}

export interface BlastRadiusResult {
  root_entity_id: string;
  affected_agents: Array<{ agent_id: string; name: string; owner_id?: string; value_at_risk_usd_millions?: number }>;
  affected_edge_count: number;
}
