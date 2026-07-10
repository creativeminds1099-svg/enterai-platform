import { Router } from "express";
import { dataStore } from "../bigquery.js";

export const initiativesRouter = Router();

initiativesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await dataStore.getInitiatives());
  } catch (err) {
    next(err);
  }
});

initiativesRouter.get("/:id", async (req, res, next) => {
  try {
    const initiatives = await dataStore.getInitiatives();
    const initiative = initiatives.find((i) => i.initiative_id === req.params.id);
    if (!initiative) return res.status(404).json({ error: "initiative_not_found" });
    res.json(initiative);
  } catch (err) {
    next(err);
  }
});
