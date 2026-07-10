import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar.js";
import { KpiCard } from "../components/KpiCard.js";
import { api } from "../api/client.js";

export function ExecutiveDashboard() {
  const [portfolio, setPortfolio] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPortfolio().then(setPortfolio).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;
  if (!portfolio) return <div className="loading">Loading executive dashboard…</div>;

  return (
    <div>
      <Topbar
        title="Executive AI Ambition Dashboard"
        subtitle="Portfolio value, cost, and directional contribution against enterprise growth, NPS, and efficiency targets."
      />

      <div className="grid grid-3">
        <KpiCard label="Forecast portfolio value" value={`$${portfolio.forecast_value_usd_millions}M`} sub="Sum of agent-level forecasts" />
        <KpiCard label="Actual value realized" value={`$${portfolio.actual_value_usd_millions}M`} sub="Measured directionally vs. baseline, not forced precision" />
        <KpiCard label="Run cost baseline" value={`$${portfolio.run_cost_usd_millions}M`} sub="Current-period cloud billing export" />
      </div>

      <div className="section-title">Portfolio by lifecycle stage</div>
      <div className="card">
        <table>
          <thead><tr><th>Stage</th><th>Agent count</th></tr></thead>
          <tbody>
            {Object.entries(portfolio.by_stage).map(([stage, count]) => (
              <tr key={stage}><td>{stage}</td><td>{String(count)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">Pivot recommendations</div>
      <div className="card">
        {portfolio.pivot_recommendations.length === 0 ? (
          <div className="empty">No agents currently flagged to tune or retire.</div>
        ) : (
          <table>
            <thead><tr><th>Agent</th><th>Pivot rule</th></tr></thead>
            <tbody>
              {portfolio.pivot_recommendations.map((r: any) => (
                <tr key={r.agent_id}><td>{r.name}</td><td style={{ textTransform: "capitalize" }}>{r.pivot_rule}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
