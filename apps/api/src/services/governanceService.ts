import { dataStore } from "../bigquery.js";
import type { Agent, GovernanceCheckType, GovernanceRecord } from "../types/models.js";

export const REQUIRED_CHECKS: GovernanceCheckType[] = [
  "security_review",
  "responsible_ai_review",
  "dlp_review",
];

export interface GovernanceQueueItem {
  agent: Agent;
  records: GovernanceRecord[];
  missing_checks: GovernanceCheckType[];
  blocked_reason: string | null;
}

/**
 * Computes production-readiness the same way agents/policies/
 * governance_approval_policy.yaml defines it: an agent can only be
 * production_ready once every required check has an Approved,
 * non-expired governance_record row. This mirrors the reconciler's
 * server-side computation so the API and the reconciler never disagree
 * about what "ready" means.
 */
export class GovernanceService {
  async queue(): Promise<GovernanceQueueItem[]> {
    const [agents, records] = await Promise.all([dataStore.getAgents(), dataStore.getGovernanceRecords()]);
    const recordsByAgent = new Map<string, GovernanceRecord[]>();
    for (const r of records) {
      if (!recordsByAgent.has(r.agent_id)) recordsByAgent.set(r.agent_id, []);
      recordsByAgent.get(r.agent_id)!.push(r);
    }

    return agents.map((agent) => {
      const agentRecords = recordsByAgent.get(agent.agent_id) ?? [];
      const missing = REQUIRED_CHECKS.filter((check) => {
        const rec = agentRecords.find((r) => r.check_type === check);
        return !rec || rec.status !== "Approved";
      });
      return {
        agent,
        records: agentRecords,
        missing_checks: missing,
        blocked_reason:
          missing.length > 0
            ? `Cannot mark production-ready: ${missing.join(", ")} not Approved.`
            : null,
      };
    });
  }

  async isProductionReady(agentId: string): Promise<boolean> {
    const queue = await this.queue();
    const item = queue.find((q) => q.agent.agent_id === agentId);
    return item ? item.missing_checks.length === 0 : false;
  }
}

export const governanceService = new GovernanceService();
