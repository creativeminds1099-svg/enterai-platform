import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar.js";
import { KpiCard } from "../components/KpiCard.js";
import { api } from "../api/client.js";

const FINDING_LABELS: Record<string, string> = {
  declared_only: "Declared, never observed deployed",
  deployed_undeclared: "Deployed, not registered (shadow AI)",
  duplicate_candidate: "Likely duplicate build",
  stale: "Stale / inactive",
};

export function DiscoveryConsole() {
  const [status, setStatus] = useState<any | null>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getDiscoveryStatus(), api.getDiscoveryFindings()])
      .then(([s, f]) => {
        setStatus(s);
        setFindings(f);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;
  if (!status) return <div className="loading">Loading discovery status…</div>;

  return (
    <div>
      <Topbar
        title="Discovery Console"
        subtitle="Mechanized scanning across cloud AI platforms, source repositories, and runtime logs, orchestrated as a multi-agent job."
        actions={[{ label: "Run Reconciliation", kind: "primary" }]}
      />

      <div className="grid grid-4">
        <KpiCard label="Registered agents" value={String(status.total_registered_agents)} />
        <KpiCard label="Declared, not deployed" value={String(status.declared_only_count)} subColor="var(--amber)" />
        <KpiCard label="Deployed, not declared" value={String(status.deployed_undeclared_count)} subColor="var(--red)" />
        <KpiCard label="Duplicate candidates" value={String(status.duplicate_candidate_count)} subColor="var(--purple)" />
      </div>

      <div className="section-title">Findings</div>
      <div className="card">
        <table>
          <thead><tr><th>Agent</th><th>Finding</th><th>Detail</th><th>Confidence</th></tr></thead>
          <tbody>
            {findings.map((f, i) => (
              <tr key={i}>
                <td>{f.agent_id}</td>
                <td>{FINDING_LABELS[f.finding_type] ?? f.finding_type}</td>
                <td style={{ color: "var(--muted)" }}>{f.detail}</td>
                <td>{Math.round(f.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {findings.length === 0 && <div className="empty">No open findings from the last reconciliation pass.</div>}
      </div>

      <div className="section-title">Collector sources</div>
      <div className="card grid grid-3">
        <div><b>Google Cloud Agent Registry</b><p style={{ color: "var(--muted)", fontSize: 12 }}>Agents, MCP servers, endpoints</p></div>
        <div><b>Vertex AI Agent Engine</b><p style={{ color: "var(--muted)", fontSize: 12 }}>Deployed reasoning engines</p></div>
        <div><b>Cloud Asset Inventory</b><p style={{ color: "var(--muted)", fontSize: 12 }}>Cloud Run services/jobs, endpoints</p></div>
        <div><b>IAM service accounts</b><p style={{ color: "var(--muted)", fontSize: 12 }}>Identity and role bindings</p></div>
        <div><b>Runtime logs</b><p style={{ color: "var(--muted)", fontSize: 12 }}>Usage, latency, cost telemetry</p></div>
      </div>
    </div>
  );
}
