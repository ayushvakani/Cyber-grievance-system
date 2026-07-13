import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import GovLayout from "./components/layout/GovLayout";
import PublicLayout from "./components/layout/PublicLayout";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import FraudNetwork from "./pages/FraudNetwork";
import AnomalyAlerts from "./pages/AnomalyAlerts";
import Settings from "./pages/Settings";
import OfficerReport from "./pages/OfficerReport";
import PipelineDemo from "./pages/PipelineDemo";
import Home from "./pages/Home";
import ComplaintForm from "./pages/ComplaintForm";
import CheckStatus from "./pages/CheckStatus";
import AdminLogin from "./pages/AdminLogin";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/submit" element={<PublicLayout><ComplaintForm /></PublicLayout>} />
          <Route path="/status" element={<PublicLayout><CheckStatus /></PublicLayout>} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Admin Routes (Protected) */}
          <Route path="/admin/*" element={
            <ProtectedRoute />
          }>
            <Route path="*" element={
              <GovLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="complaints" element={<Complaints />} />
                  <Route path="complaints/:id" element={<ComplaintDetail />} />
                  <Route path="network" element={<FraudNetwork />} />
                  <Route path="alerts" element={<AnomalyAlerts />} />
                  <Route path="pipeline" element={<PipelineDemo />} />
                  <Route path="officer-report" element={<OfficerReport />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </GovLayout>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;