import { BigQuery } from "@google-cloud/bigquery";
import { config } from "./config.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Agent,
  DependencyEdge,
  DiscoveryFinding,
  GovernanceRecord,
  Initiative,
  McpServer,
  ValueCostMetric,
} from "./types/models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let bqClient: BigQuery | null = null;
function client(): BigQuery {
  if (!bqClient) {
    bqClient = new BigQuery({ projectId: config.projectId });
  }
  return bqClient;
}

function loadFixture<T>(name: string): T {
  const p = path.join(__dirname, "fixtures", `${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

/**
 * DataStore is the single seam between "reading from BigQuery" and
 * "reading from local fixtures" (ENTERAI_USE_FIXTURES=true, the default
 * for local dev — see .env.example). Every route handler goes through
 * this instead of touching @google-cloud/bigquery or fs directly, so the
 * API is fully runnable without a live GCP project.
 */
export class DataStore {
  async query<T>(sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
    if (config.useFixtures) {
      throw new Error(
        "DataStore.query() requires a live BigQuery connection; fixture mode only supports the typed getters below."
      );
    }
    const [rows] = await client().query({ query: sql, params, location: "US" });
    return rows as T[];
  }

  async getInitiatives(): Promise<Initiative[]> {
    if (config.useFixtures) return loadFixture<Initiative[]>("initiatives");
    return this.query<Initiative>(
      `SELECT * FROM \`${config.projectId}.${config.datasetId}.enterai_ai_initiative\``
    );
  }

  async getAgents(): Promise<Agent[]> {
    if (config.useFixtures) return loadFixture<Agent[]>("agents");
    return this.query<Agent>(`SELECT * FROM \`${config.projectId}.${config.datasetId}.enterai_ai_agent\``);
  }

  async getAgent(agentId: string): Promise<Agent | undefined> {
    const agents = await this.getAgents();
    return agents.find((a) => a.agent_id === agentId);
  }

  async getMcpServers(): Promise<McpServer[]> {
    if (config.useFixtures) return loadFixture<McpServer[]>("mcp_servers");
    return this.query<McpServer>(`SELECT * FROM \`${config.projectId}.${config.datasetId}.enterai_ai_mcp_server\``);
  }

  async getDependencyEdges(): Promise<DependencyEdge[]> {
    if (config.useFixtures) return loadFixture<DependencyEdge[]>("dependency_edges");
    return this.query<DependencyEdge>(
      `SELECT * FROM \`${config.projectId}.${config.datasetId}.enterai_ai_dependency_edge\``
    );
  }

  async getGovernanceRecords(): Promise<GovernanceRecord[]> {
    if (config.useFixtures) return loadFixture<GovernanceRecord[]>("governance_records");
    return this.query<GovernanceRecord>(
      `SELECT * FROM \`${config.projectId}.${config.datasetId}.enterai_ai_governance_record\``
    );
  }

  async getValueMetrics(): Promise<ValueCostMetric[]> {
    if (config.useFixtures) return loadFixture<ValueCostMetric[]>("value_metrics");
    return this.query<ValueCostMetric>(
      `SELECT * FROM \`${config.projectId}.${config.datasetId}.enterai_ai_value_cost_metric\``
    );
  }

  async getDiscoveryFindings(): Promise<DiscoveryFinding[]> {
    // Findings are produced by services/reconciler at run time, not stored
    // in a canonical table (they are ephemeral, recomputed each pass); the
    // API exposes the latest reconciler summary via fixtures locally.
    return loadFixture<DiscoveryFinding[]>("discovery_findings");
  }
}

export const dataStore = new DataStore();
