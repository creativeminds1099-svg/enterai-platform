interface TopbarProps {
  title: string;
  subtitle: string;
  actions?: Array<{ label: string; kind?: "primary" | "default" }>;
}

export function Topbar({ title, subtitle, actions = [] }: TopbarProps) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        {actions.map((a) => (
          <button key={a.label} className={`btn${a.kind === "primary" ? " btn-primary" : ""}`}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
