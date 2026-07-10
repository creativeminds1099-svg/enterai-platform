import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { initiativesRouter } from "./routes/initiatives.js";
import { agentsRouter } from "./routes/agents.js";
import { mcpServersRouter } from "./routes/mcpServers.js";
import { dependencyGraphRouter } from "./routes/dependencyGraph.js";
import { governanceRouter } from "./routes/governance.js";
import { discoveryRouter } from "./routes/discovery.js";
import { executiveDashboardRouter } from "./routes/executiveDashboard.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(pinoHttp());

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "enterai-api", using_fixtures: config.useFixtures });
});

app.use("/api/initiatives", initiativesRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/mcp-servers", mcpServersRouter);
app.use("/api/dependency-graph", dependencyGraphRouter);
app.use("/api/governance", governanceRouter);
app.use("/api/discovery", discoveryRouter);
app.use("/api/executive-dashboard", executiveDashboardRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error", message: err.message });
});

app.listen(config.port, () => {
  console.log(
    `EnterAI API listening on :${config.port} (fixtures=${config.useFixtures}, dataset=${config.datasetId})`
  );
});
