import { Router } from "express";
import { governanceService } from "../services/governanceService.js";

export const governanceRouter = Router();

governanceRouter.get("/queue", async (_req, res, next) => {
  try {
    res.json(await governanceService.queue());
  } catch (err) {
    next(err);
  }
});

governanceRouter.get("/agents/:id/production-ready", async (req, res, next) => {
  try {
    res.json({ agent_id: req.params.id, production_ready: await governanceService.isProductionReady(req.params.id) });
  } catch (err) {
    next(err);
  }
});
