import { BrowserRouter, Routes, Route } from "react-router-dom";
import GovLayout from "./components/layout/GovLayout";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import FraudNetwork from "./pages/FraudNetwork";
import AnomalyAlerts from "./pages/AnomalyAlerts";
import Settings from "./pages/Settings";
import PipelineDemo from "./pages/PipelineDemo";

function App() {
  return (
    <BrowserRouter>
      <GovLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route path="/network" element={<FraudNetwork />} />
          <Route path="/alerts" element={<AnomalyAlerts />} />
          <Route path="/pipeline" element={<PipelineDemo />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </GovLayout>
    </BrowserRouter>
  );
}

export default App;