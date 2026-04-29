import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { api, RecentComplaint } from "../services/api";
import ComplaintTable from "../components/ui/ComplaintTable";
import InsightsPanel from "../components/ui/InsightsPanel";

export default function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState<RecentComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsightsId, setSelectedInsightsId] = useState<string | null>(null);

  useEffect(() => {
    api.getAnomalies()
      .then(setAnomalies)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-red-50 border border-red-200 rounded p-4 flex gap-4 items-start shadow-sm">
        <div className="bg-red-100 p-2 rounded-full text-gov-alert">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Anomaly Alerts (INCORRECT CRAG Path)</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            These complaints triggered the fallback anomaly pipeline due to extremely low confidence scores against existing knowledge bases, or were flagged as Critical severity. Review them carefully to identify emerging threat vectors.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 shadow-sm rounded">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Flagged Complaints</h2>
          {!loading && <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">{anomalies.length} found</span>}
        </div>
        <div className="p-0">
          {error ? (
            <div className="p-4 flex gap-2 text-gov-alert text-sm">
              <AlertTriangle size={16} /> Failed to load alerts: {error}
            </div>
          ) : (
            <ComplaintTable 
              complaints={anomalies} 
              loading={loading} 
              onInsights={setSelectedInsightsId} 
            />
          )}
        </div>
      </div>

      <InsightsPanel
        complaintId={selectedInsightsId}
        onClose={() => setSelectedInsightsId(null)}
      />
    </div>
  );
}
