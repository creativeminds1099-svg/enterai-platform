import { Router } from "express";
import { graphService } from "../services/graphService.js";
import { dataStore } from "../bigquery.js";

export const dependencyGraphRouter = Router();

dependencyGraphRouter.get("/edges", async (_req, res, next) => {
  try {
    res.json(await dataStore.getDependencyEdges());
  } catch (err) {
    next(err);
  }
});

dependencyGraphRouter.get("/neighbors/:entityType/:entityId", async (req, res, next) => {
  try {
    res.json(await graphService.neighbors(req.params.entityType, req.params.entityId));
  } catch (err) {
    next(err);
  }
});

/** Powers the "simulate an outage" action on the Dependency Graph screen. */
dependencyGraphRouter.get("/blast-radius/:entityType/:entityId", async (req, res, next) => {
  try {
    const maxDepth = req.query.depth ? Number(req.query.depth) : 3;
    res.json(await graphService.blastRadius(req.params.entityType, req.params.entityId, maxDepth));
  } catch (err) {
    next(err);
  }
});
