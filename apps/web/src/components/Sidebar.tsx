import { NavLink } from "react-router-dom";

const NAV_ITEMS: Array<{ to: string; label: string; color: string }> = [
  { to: "/", label: "Command Center", color: "var(--blue)" },
  { to: "/executive-dashboard", label: "Executive Dashboards", color: "var(--cyan)" },
  { to: "/agents", label: "Agent Registry", color: "var(--teal)" },
  { to: "/dependency-graph", label: "Dependency Graph", color: "var(--purple)" },
  { to: "/governance", label: "Governance Workbench", color: "var(--green)" },
  { to: "/discovery", label: "Discovery Console", color: "var(--teal)" },
  { to: "/intake", label: "Intake Wizard", color: "var(--amber)" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">E</div>
        <div>
          <div className="brand-name">EnterAI</div>
          <div className="brand-sub">Enterprise AI Control Plane</div>
        </div>
      </div>

      <div className="env-box">
        <div className="env-row"><span>Environment</span><b>Production Registry</b></div>
        <div className="env-row"><span>Discovery</span><b style={{ color: "var(--teal)" }}>Antigravity-orchestrated</b></div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-dot" style={{ background: item.color }} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="antigravity-card">
        <b>Powered by Antigravity</b>
        Multi-agent orchestration, shared harnesses &amp; discovery subagents run every collector job.
      </div>
    </aside>
  );
}
