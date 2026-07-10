import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar.js";
import { KpiCard } from "../components/KpiCard.js";
import { StagePill, RiskPill } from "../components/StatusPill.js";
import { api } from "../api/client.js";

export function CommandCenter() {
  const [portfolio, setPortfolio] = useState<any | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getPortfolio(), api.getAgents(), api.getDiscoveryFindings()])
      .then(([p, a, f]) => {
        setPortfolio(p);
        setAgents(a);
        setFindings(f);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;
  if (!portfolio) return <div className="loading">Loading command center…</div>;

  const recentAgents = [...agents].slice(0, 6);

  return (
    <div>
      <Topbar
        title="Command Center"
        subtitle="Portfolio-wide view across every AI initiative, agent, value, cost, risk, lifecycle, and dependency."
        actions={[{ label: "Run Discovery" }, { label: "New Initiative", kind: "primary" }]}
      />

      <div className="grid grid-4">
        <KpiCard label="Registered agents" value={String(portfolio.total_agents)} sub={`Across ${portfolio.total_initiatives} initiatives`} />
        <KpiCard
          label="Forecast value"
          value={`$${portfolio.forecast_value_usd_millions}M`}
          sub={`$${portfolio.actual_value_usd_millions}M realized so far`}
          subColor="var(--teal)"
        />
        <KpiCard label="Run cost baseline" value={`$${portfolio.run_cost_usd_millions}M`} sub="Cloud billing export, current period" />
        <KpiCard
          label="Discovery flags"
          value={String(findings.length)}
          sub="Declared-only, shadow AI, and duplicate candidates"
          subColor="var(--amber)"
        />
      </div>

      <div className="section-title">Recently touched agents</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Function</th>
              <th>Lifecycle</th>
              <th>Risk</th>
              <th>Runtime</th>
            </tr>
          </thead>
          <tbody>
            {recentAgents.map((a) => (
              <tr key={a.agent_id}>
                <td>{a.name}</td>
                <td>{a.function_area}</td>
                <td><StagePill stage={a.lifecycle_state} /></td>
                <td><RiskPill risk={a.risk_flag} /></td>
                <td>{a.runtime_platform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
