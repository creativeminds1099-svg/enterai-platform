import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar.js";
import { StagePill, RiskPill } from "../components/StatusPill.js";
import { api } from "../api/client.js";

export function AgentRegistry() {
  const [agents, setAgents] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAgents().then(setAgents).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;

  const filtered = agents.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <Topbar
        title="Agent Registry"
        subtitle="Searchable, filterable inventory of every registered AI agent with lifecycle, ownership, value, cost, and risk."
        actions={[{ label: "Register Agent", kind: "primary" }]}
      />

      <input
        placeholder="Search agents by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--panel)",
          color: "var(--text)",
          marginBottom: 16,
        }}
      />

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Function</th>
              <th>Lifecycle</th>
              <th>Risk</th>
              <th>Model</th>
              <th>Forecast value</th>
              <th>Run cost</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.agent_id}>
                <td><Link to={`/agents/${a.agent_id}`} style={{ color: "var(--blue-2)" }}>{a.name}</Link></td>
                <td>{a.function_area}</td>
                <td><StagePill stage={a.lifecycle_state} /></td>
                <td><RiskPill risk={a.risk_flag} /></td>
                <td>{a.model_ids?.[0] ?? "—"}</td>
                <td>{a.value_forecast_usd_millions != null ? `$${a.value_forecast_usd_millions}M` : "—"}</td>
                <td>{a.run_cost_usd_millions != null ? `$${a.run_cost_usd_millions}M` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty">No agents match "{query}".</div>}
      </div>
    </div>
  );
}
