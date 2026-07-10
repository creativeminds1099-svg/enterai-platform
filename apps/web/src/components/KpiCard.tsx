interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}

export function KpiCard({ label, value, sub, subColor }: KpiCardProps) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub" style={subColor ? { color: subColor } : undefined}>{sub}</div>}
    </div>
  );
}
