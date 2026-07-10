import { Router } from "express";
import { dataStore } from "../bigquery.js";

export const mcpServersRouter = Router();

mcpServersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await dataStore.getMcpServers());
  } catch (err) {
    next(err);
  }
});

mcpServersRouter.get("/:id", async (req, res, next) => {
  try {
    const servers = await dataStore.getMcpServers();
    const server = servers.find((s) => s.mcp_server_id === req.params.id);
    if (!server) return res.status(404).json({ error: "mcp_server_not_found" });
    res.json(server);
  } catch (err) {
    next(err);
  }
});
