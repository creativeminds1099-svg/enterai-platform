import { dataStore } from "../bigquery.js";
import type { Agent, ValueCostMetric } from "../types/models.js";

export interface PortfolioRollup {
  total_agents: number;
  total_initiatives: number;
  forecast_value_usd_millions: number;
  actual_value_usd_millions: number;
  run_cost_usd_millions: number;
  by_stage: Record<string, number>;
  by_risk: Record<string, number>;
  pivot_recommendations: Array<{ agent_id: string; name: string; pivot_rule: string | null | undefined }>;
}

/**
 * Rolls agent-level value/cost metrics up into the portfolio numbers the
 * Executive Ambition Dashboard shows. Deliberately keeps forecast and
 * actual separate rather than blending them into one "confidence-adjusted"
 * number — see docs/ARCHITECTURE.md and the blog post's point about not
 * faking precision on cross-functional attribution.
 */
export class ValueScoringService {
  async portfolioRollup(): Promise<PortfolioRollup> {
    const [agents, initiatives, metrics] = await Promise.all([
      dataStore.getAgents(),
      dataStore.getInitiatives(),
      dataStore.getValueMetrics(),
    ]);

    const byAgentMetrics = new Map<string, ValueCostMetric[]>();
    for (const m of metrics) {
      if (m.entity_type !== "agent") continue;
      if (!byAgentMetrics.has(m.entity_id)) byAgentMetrics.set(m.entity_id, []);
      byAgentMetrics.get(m.entity_id)!.push(m);
    }

    let forecastTotal = 0;
    let actualTotal = 0;
    let costTotal = 0;
    const byStage: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    const pivotRecommendations: PortfolioRollup["pivot_recommendations"] = [];

    for (const agent of agents) {
      byStage[agent.lifecycle_state] = (byStage[agent.lifecycle_state] ?? 0) + 1;
      byRisk[agent.risk_flag] = (byRisk[agent.risk_flag] ?? 0) + 1;

      const agentMetrics = byAgentMetrics.get(agent.agent_id) ?? [];
      for (const m of agentMetrics) {
        if (m.metric_type === "run_cost") {
          costTotal += m.forecast_value ?? 0;
        } else {
          forecastTotal += m.forecast_value ?? 0;
          actualTotal += m.actual_value ?? 0;
        }
        if (m.pivot_rule && m.pivot_rule !== "scale") {
          pivotRecommendations.push({ agent_id: agent.agent_id, name: agent.name, pivot_rule: m.pivot_rule });
        }
      }
    }

    return {
      total_agents: agents.length,
      total_initiatives: initiatives.length,
      forecast_value_usd_millions: round1(forecastTotal),
      actual_value_usd_millions: round1(actualTotal),
      run_cost_usd_millions: round1(costTotal),
      by_stage: byStage,
      by_risk: byRisk,
      pivot_recommendations: dedupeBy(pivotRecommendations, (r) => r.agent_id),
    };
  }

  async agentValue(agent: Agent): Promise<ValueCostMetric[]> {
    const metrics = await dataStore.getValueMetrics();
    return metrics.filter((m) => m.entity_type === "agent" && m.entity_id === agent.agent_id);
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const valueScoringService = new ValueScoringService();
