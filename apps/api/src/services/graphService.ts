import { dataStore } from "../bigquery.js";
import type { BlastRadiusResult, DependencyEdge } from "../types/models.js";

/**
 * In-memory adjacency-list traversal over enterai_ai_dependency_edge rows.
 * In production this mirrors a BigQuery Graph query (see
 * infra/terraform/bigquery.tf and docs/ARCHITECTURE.md); this
 * implementation lets the API answer dependency-graph and blast-radius
 * questions without requiring a live BigQuery Graph deployment for local
 * development or tests.
 */
export class GraphService {
  async buildAdjacency(): Promise<Map<string, DependencyEdge[]>> {
    const edges = await dataStore.getDependencyEdges();
    const adjacency = new Map<string, DependencyEdge[]>();
    for (const edge of edges) {
      const key = `${edge.from_entity_type}:${edge.from_entity_id}`;
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key)!.push(edge);

      // Also index the reverse direction so "what points at me" queries
      // (used for blast-radius) don't need a second pass over all edges.
      const reverseKey = `${edge.to_entity_type}:${edge.to_entity_id}`;
      if (!adjacency.has(reverseKey)) adjacency.set(reverseKey, []);
      adjacency.get(reverseKey)!.push(edge);
    }
    return adjacency;
  }

  /** Returns every edge touching entityType:entityId, one hop out. */
  async neighbors(entityType: string, entityId: string): Promise<DependencyEdge[]> {
    const adjacency = await this.buildAdjacency();
    return adjacency.get(`${entityType}:${entityId}`) ?? [];
  }

  /**
   * Bounded BFS from a node, following edges in both directions, to find
   * every agent that would be affected if this node failed. This is what
   * powers the Dependency Graph screen's "simulate an outage" action.
   */
  async blastRadius(entityType: string, entityId: string, maxDepth = 3): Promise<BlastRadiusResult> {
    const adjacency = await this.buildAdjacency();
    const agents = await dataStore.getAgents();
    const agentById = new Map(agents.map((a) => [a.agent_id, a]));
    const valueMetrics = await dataStore.getValueMetrics();
    const forecastByAgent = new Map(
      valueMetrics
        .filter((v) => v.entity_type === "agent" && v.metric_type !== "run_cost")
        .map((v) => [v.entity_id, v.forecast_value ?? 0])
    );

    const visited = new Set<string>([`${entityType}:${entityId}`]);
    const affectedAgentIds = new Set<string>();
    let queue: Array<{ key: string; depth: number }> = [{ key: `${entityType}:${entityId}`, depth: 0 }];
    let edgeCount = 0;

    while (queue.length > 0) {
      const { key, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      const edges = adjacency.get(key) ?? [];
      for (const edge of edges) {
        edgeCount += 1;
        const otherKey =
          `${edge.from_entity_type}:${edge.from_entity_id}` === key
            ? `${edge.to_entity_type}:${edge.to_entity_id}`
            : `${edge.from_entity_type}:${edge.from_entity_id}`;
        const [otherType, otherId] = otherKey.split(":");
        if (otherType === "agent") affectedAgentIds.add(otherId);
        if (!visited.has(otherKey)) {
          visited.add(otherKey);
          queue.push({ key: otherKey, depth: depth + 1 });
        }
      }
    }

    affectedAgentIds.delete(entityId);

    return {
      root_entity_id: entityId,
      affected_agents: Array.from(affectedAgentIds)
        .map((id) => agentById.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({
          agent_id: a.agent_id,
          name: a.name,
          owner_id: a.owner_id,
          value_at_risk_usd_millions: forecastByAgent.get(a.agent_id),
        })),
      affected_edge_count: edgeCount,
    };
  }
}

export const graphService = new GraphService();
