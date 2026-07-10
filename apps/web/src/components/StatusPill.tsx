import type { CSSProperties } from "react";

const STAGE_COLORS: Record<string, string> = {
  "Scaling-Production": "var(--green)",
  Pilot: "var(--amber)",
  Experimentation: "var(--amber)",
  Ideation: "var(--purple)",
  Retired: "var(--muted)",
  Quarantined: "var(--red)",
};

const RISK_COLORS: Record<string, string> = {
  High: "var(--red)",
  Medium: "var(--amber)",
  Low: "var(--teal)",
};

const GOVERNANCE_COLORS: Record<string, string> = {
  Approved: "var(--green)",
  "In Review": "var(--amber)",
  "Not Started": "var(--muted)",
  Rejected: "var(--red)",
  Expired: "var(--red)",
};

function pillStyle(color: string): CSSProperties {
  return { background: `${color}29`, border: `1px solid ${color}8c`, color };
}

export function StagePill({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage] ?? "var(--muted)";
  return <span className="pill" style={pillStyle(color)}>{stage}</span>;
}

export function RiskPill({ risk }: { risk: string }) {
  const color = RISK_COLORS[risk] ?? "var(--muted)";
  return <span className="pill" style={pillStyle(color)}>{risk} risk</span>;
}

export function GovernancePill({ status }: { status: string }) {
  const color = GOVERNANCE_COLORS[status] ?? "var(--muted)";
  return <span className="pill" style={pillStyle(color)}>{status}</span>;
}
