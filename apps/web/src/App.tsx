import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar.js";
import { CommandCenter } from "./pages/CommandCenter.js";
import { ExecutiveDashboard } from "./pages/ExecutiveDashboard.js";
import { AgentRegistry } from "./pages/AgentRegistry.js";
import { AgentDetail } from "./pages/AgentDetail.js";
import { DependencyGraph } from "./pages/DependencyGraph.js";
import { GovernanceWorkbench } from "./pages/GovernanceWorkbench.js";
import { DiscoveryConsole } from "./pages/DiscoveryConsole.js";
import { IntakeWizard } from "./pages/IntakeWizard.js";

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
          <Route path="/agents" element={<AgentRegistry />} />
          <Route path="/agents/:agentId" element={<AgentDetail />} />
          <Route path="/dependency-graph" element={<DependencyGraph />} />
          <Route path="/governance" element={<GovernanceWorkbench />} />
          <Route path="/discovery" element={<DiscoveryConsole />} />
          <Route path="/intake" element={<IntakeWizard />} />
        </Routes>
      </main>
    </div>
  );
}
