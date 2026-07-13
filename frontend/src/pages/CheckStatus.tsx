import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Card } from "../components/ui/Card";
import Badge, { statusVariant } from "../components/ui/Badge";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

interface PublicStatusData {
  complaint_id: string;
  citizen_name: string;
  date_of_incident: string;
  complaint_text: string;
  reply_text: string | null;
  status: string;
}

export default function CheckStatus() {
  const [complaintId, setComplaintId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicStatusData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintId.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`${BASE_URL}/api/complaint/${complaintId.trim()}/public-status`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.detail || "Complaint not found. Please check the ID and try again.");
      }

      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 min-h-[80vh]">
      <Link to="/" className="inline-flex items-center gap-2 text-gov-blue hover:text-blue-800 font-medium mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden mb-6">
        <div className="bg-gov-bg border-b border-gray-200 px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Search className="text-gov-primary" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">Check Complaint Status</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Enter your tracking ID below to check the current status of your cyber grievance and view any responses from the investigating officer.
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              placeholder="e.g. 3bed025c-8012-4d55-9fb5-221b53be5e68"
              className="flex-1 border border-gray-300 rounded px-4 py-3 outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue font-mono"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gov-primary hover:bg-red-800 text-white font-semibold px-8 py-3 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-gov-alert px-4 py-3 rounded flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {data && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card title="Complaint Details">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Tracking ID</span>
                <span className="font-mono text-sm text-gray-900">{data.complaint_id}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Status</span>
                <Badge variant={statusVariant(data.status)} label={data.status} />
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Complainant</span>
                <span className="text-sm text-gray-900">{data.citizen_name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Date of Incident</span>
                <span className="text-sm text-gray-900">{data.date_of_incident}</span>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Complaint Description</span>
              <div className="bg-gray-50 border border-gray-100 rounded p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {data.complaint_text || "No text description provided."}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-3">Officer Response</span>
              
              {data.reply_text ? (
                <div className="bg-blue-50/50 border border-blue-100 rounded p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gov-blue"></div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-gov-blue" />
                    <span className="font-bold text-gray-900 text-sm">Response Received</span>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap pl-1">
                    {data.reply_text}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded p-5 flex items-start gap-3">
                  <Clock size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1">In Process</h4>
                    <p className="text-amber-800 text-sm">
                      Your complaint has been registered and is currently under review by our investigating officers. 
                      You will see a response here once it has been processed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
