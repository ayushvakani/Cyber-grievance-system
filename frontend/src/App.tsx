import { BrowserRouter, Routes, Route } from "react-router-dom";
import GovLayout from "./components/layout/GovLayout";
import Dashboard from "./pages/Dashboard";
import ComplaintDetail from "./pages/ComplaintDetail";
import FraudNetwork from "./pages/FraudNetwork";

function App() {
  return (
    <BrowserRouter>
      <GovLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route path="/network" element={<FraudNetwork />} />
        </Routes>
      </GovLayout>
    </BrowserRouter>
  );
}

export default App;