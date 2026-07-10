import { Router } from "express";
import { dataStore } from "../bigquery.js";
import { governanceService } from "../services/governanceService.js";
import { valueScoringService } from "../services/valueScoringService.js";

export const agentsRouter = Router();

agentsRouter.get("/", async (req, res, next) => {
  try {
    let agents = await dataStore.getAgents();
    const { lifecycle_state, risk_flag, function_area, q } = req.query;

    if (lifecycle_state) agents = agents.filter((a) => a.lifecycle_state === lifecycle_state);
    if (risk_flag) agents = agents.filter((a) => a.risk_flag === risk_flag);
    if (function_area) agents = agents.filter((a) => a.function_area === function_area);
    if (q && typeof q === "string") {
      const needle = q.toLowerCase();
      agents = agents.filter(
        (a) => a.name.toLowerCase().includes(needle) || (a.description ?? "").toLowerCase().includes(needle)
      );
    }

    res.json(agents);
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/:id", async (req, res, next) => {
  try {
    const agent = await dataStore.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "agent_not_found" });

    const [valueMetrics, governanceQueue] = await Promise.all([
      valueScoringService.agentValue(agent),
      governanceService.queue(),
    ]);
    const governance = governanceQueue.find((g) => g.agent.agent_id === agent.agent_id);

    res.json({
      ...agent,
      value_metrics: valueMetrics,
      governance_records: governance?.records ?? [],
      missing_governance_checks: governance?.missing_checks ?? [],
    });
  } catch (err) {
    next(err);
  }
});
