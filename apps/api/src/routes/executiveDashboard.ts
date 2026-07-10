import { Router } from "express";
import { valueScoringService } from "../services/valueScoringService.js";

export const executiveDashboardRouter = Router();

executiveDashboardRouter.get("/portfolio", async (_req, res, next) => {
  try {
    res.json(await valueScoringService.portfolioRollup());
  } catch (err) {
    next(err);
  }
});
