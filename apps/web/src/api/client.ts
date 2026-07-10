const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`EnterAI API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getInitiatives: () => request<any[]>("/api/initiatives"),
  getAgents: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<any[]>(`/api/agents${qs}`);
  },
  getAgent: (id: string) => request<any>(`/api/agents/${id}`),
  getMcpServers: () => request<any[]>("/api/mcp-servers"),
  getDependencyEdges: () => request<any[]>("/api/dependency-graph/edges"),
  getBlastRadius: (entityType: string, entityId: string) =>
    request<any>(`/api/dependency-graph/blast-radius/${entityType}/${entityId}`),
  getGovernanceQueue: () => request<any[]>("/api/governance/queue"),
  getDiscoveryFindings: () => request<any[]>("/api/discovery/findings"),
  getDiscoveryStatus: () => request<any>("/api/discovery/status"),
  getPortfolio: () => request<any>("/api/executive-dashboard/portfolio"),
};
