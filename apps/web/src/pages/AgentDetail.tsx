import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar.js";
import { StagePill, RiskPill, GovernancePill } from "../components/StatusPill.js";
import { KpiCard } from "../components/KpiCard.js";
import { api } from "../api/client.js";

export function AgentDetail() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState<any | null>(null);
  const [blastRadius, setBlastRadius] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    api.getAgent(agentId).then(setAgent).catch((e) => setError(String(e)));
    api.getBlastRadius("agent", agentId).then(setBlastRadius).catch(() => {});
  }, [agentId]);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;
  if (!agent) return <div className="loading">Loading agent…</div>;

  return (
    <div>
      <Link to="/agents" className="back-link">&larr; Back to Agent Registry</Link>
      <div className="detail-header">
        <div>
          <h1 style={{ margin: "0 0 6px 0" }}>{agent.name}</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>{agent.description}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <StagePill stage={agent.lifecycle_state} />
          <RiskPill risk={agent.risk_flag} />
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 20 }}>
        <KpiCard label="Owner" value={agent.owner_id ?? "Unassigned"} sub={agent.function_area} />
        <KpiCard label="Runtime" value={agent.runtime_platform ?? "—"} sub={agent.framework} />
        <KpiCard
          label="Production ready"
          value={agent.production_ready ? "Yes" : "No"}
          sub={agent.missing_governance_checks?.length ? `Missing: ${agent.missing_governance_checks.join(", ")}` : "All checks approved"}
          subColor={agent.production_ready ? "var(--green)" : "var(--amber)"}
        />
        <KpiCard
          label="Blast radius"
          value={blastRadius ? String(blastRadius.affected_agents.length) : "…"}
          sub="Dependent agents if this fails"
          subColor="var(--red)"
        />
      </div>

      <div className="section-title">Governance checks</div>
      <div className="card">
        <table>
          <thead><tr><th>Check</th><th>Status</th><th>Reviewer role</th></tr></thead>
          <tbody>
            {(agent.governance_records ?? []).map((g: any) => (
              <tr key={g.governance_record_id}>
                <td style={{ textTransform: "capitalize" }}>{g.check_type.replaceAll("_", " ")}</td>
                <td><GovernancePill status={g.status} /></td>
                <td>{g.reviewer_role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">Dependencies</div>
      <div className="card grid grid-2">
        <div>
          <b>Models</b>
          <ul>{(agent.model_ids ?? []).map((m: string) => <li key={m}>{m}</li>)}</ul>
        </div>
        <div>
          <b>MCP servers</b>
          <ul>{(agent.mcp_server_ids ?? []).length ? agent.mcp_server_ids.map((m: string) => <li key={m}>{m}</li>) : <li>None</li>}</ul>
        </div>
      </div>
    </div>
  );
}
