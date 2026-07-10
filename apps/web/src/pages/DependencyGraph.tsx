import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar.js";
import { api } from "../api/client.js";

export function DependencyGraph() {
  const [edges, setEdges] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [blastRadius, setBlastRadius] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getDependencyEdges(), api.getAgents()])
      .then(([e, a]) => {
        setEdges(e);
        setAgents(a);
        if (a.length) setSelected(a[0].agent_id);
      })
      .catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.getBlastRadius("agent", selected).then(setBlastRadius).catch(() => setBlastRadius(null));
  }, [selected]);

  if (error) return <div className="empty">Could not reach the EnterAI API: {error}</div>;

  const edgesForSelected = edges.filter(
    (e) => (e.from_entity_type === "agent" && e.from_entity_id === selected) ||
           (e.to_entity_type === "agent" && e.to_entity_id === selected)
  );

  return (
    <div>
      <Topbar
        title="Dependency Graph"
        subtitle="Click any node to see what a model, prompt, MCP server, or API failure would actually impact."
        actions={[{ label: "Simulate Outage", kind: "primary" }]}
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: "var(--muted)", marginRight: 10 }}>Center graph on agent:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}
        >
          {agents.map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
        </select>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Direct relationships ({edgesForSelected.length})</div>
          <table>
            <thead><tr><th>From</th><th>Relationship</th><th>To</th></tr></thead>
            <tbody>
              {edgesForSelected.map((e) => (
                <tr key={e.edge_id}>
                  <td>{e.from_entity_type}:{e.from_entity_id}</td>
                  <td>{e.relationship_type}</td>
                  <td>{e.to_entity_type}:{e.to_entity_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Simulated blast radius</div>
          {!blastRadius ? (
            <div className="loading">Computing…</div>
          ) : blastRadius.affected_agents.length === 0 ? (
            <div className="empty">No downstream agents would be affected.</div>
          ) : (
            <table>
              <thead><tr><th>Affected agent</th><th>Owner</th><th>Value at risk</th></tr></thead>
              <tbody>
                {blastRadius.affected_agents.map((a: any) => (
                  <tr key={a.agent_id}>
                    <td>{a.name}</td>
                    <td>{a.owner_id ?? "Unassigned"}</td>
                    <td>{a.value_at_risk_usd_millions != null ? `$${a.value_at_risk_usd_millions}M` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
