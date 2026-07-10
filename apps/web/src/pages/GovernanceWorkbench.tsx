import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar.js";
import { GovernancePill, RiskPill } from "../components/StatusPill.js";
import { api } from "../api/client.js";

export function GovernanceWorkbench() {
  const [queue, setQueue] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGovernanceQueue().then(setQueue).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;

  const blocked = queue.filter((q) => q.blocked_reason);
  const clear = queue.filter((q) => !q.blocked_reason);

  return (
    <div>
      <Topbar
        title="Governance Workbench"
        subtitle="A board-style queue for security review, responsible-AI review, data-loss-prevention checks, and production readiness."
      />

      <div className="section-title">Blocked from production ({blocked.length})</div>
      <div className="card">
        {blocked.length === 0 ? (
          <div className="empty">Nothing blocked — every registered agent has its required approvals.</div>
        ) : (
          <table>
            <thead><tr><th>Agent</th><th>Risk</th><th>Missing checks</th><th>Reason</th></tr></thead>
            <tbody>
              {blocked.map((q) => (
                <tr key={q.agent.agent_id}>
                  <td>{q.agent.name}</td>
                  <td><RiskPill risk={q.agent.risk_flag} /></td>
                  <td>{q.missing_checks.map((c: string) => <GovernancePill key={c} status="Not Started" />)} </td>
                  <td style={{ color: "var(--muted)" }}>{q.blocked_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-title">Production-ready ({clear.length})</div>
      <div className="card">
        <table>
          <thead><tr><th>Agent</th><th>Risk</th><th>Checks</th></tr></thead>
          <tbody>
            {clear.map((q) => (
              <tr key={q.agent.agent_id}>
                <td>{q.agent.name}</td>
                <td><RiskPill risk={q.agent.risk_flag} /></td>
                <td>{q.records.map((r: any) => <GovernancePill key={r.governance_record_id} status={r.status} />)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
