import { Router } from "express";
import { dataStore } from "../bigquery.js";

export const discoveryRouter = Router();

/**
 * Surfaces the latest reconciler pass: declared-only agents, deployed-but-
 * undeclared resources (shadow AI candidates), and duplicate candidates.
 * See services/reconciler and agents/harness/reconciliation_agent.py for
 * where these findings are produced.
 */
discoveryRouter.get("/findings", async (_req, res, next) => {
  try {
    res.json(await dataStore.getDiscoveryFindings());
  } catch (err) {
    next(err);
  }
});

discoveryRouter.get("/status", async (_req, res, next) => {
  try {
    const [agents, findings] = await Promise.all([dataStore.getAgents(), dataStore.getDiscoveryFindings()]);
    res.json({
      total_registered_agents: agents.length,
      declared_only_count: agents.filter((a) => a.declared_only).length,
      deployed_undeclared_count: agents.filter((a) => a.deployed_undeclared).length,
      duplicate_candidate_count: findings.filter((f) => f.finding_type === "duplicate_candidate").length,
      last_reconciliation_note:
        "Reconciler runs on a scheduled Cloud Run Job; see services/reconciler/main.py and infra/terraform/cloud_run.tf.",
    });
  } catch (err) {
    next(err);
  }
});
