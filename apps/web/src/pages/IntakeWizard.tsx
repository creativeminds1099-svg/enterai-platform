import { useState } from "react";
import { Topbar } from "../components/Topbar.js";

const STEPS = ["Basics", "Ownership", "Dependencies", "Governance", "Review"];

export function IntakeWizard() {
  const [step, setStep] = useState(0);

  return (
    <div>
      <Topbar
        title="Intake Wizard"
        subtitle="Manually declare a new initiative or agent. Submissions are reconciled against discovery data, not treated as ground truth on their own."
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="pill"
              style={{
                background: i === step ? "rgba(91,141,255,0.16)" : "transparent",
                border: `1px solid ${i === step ? "var(--blue)" : "var(--line)"}`,
                color: i === step ? "var(--text)" : "var(--muted)",
              }}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p style={{ color: "var(--muted)" }}>
          This reference implementation stops the wizard at a read-only preview: submitting here would create a
          WriteProposal for entity_type "agent" and route through
          <code> agents/harness/approval_gate.py</code> exactly like a collector's output, since ownership and
          lifecycle_state are gated fields per <code>collector_write_policy.yaml</code>.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
          <button
            className="btn btn-primary"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
