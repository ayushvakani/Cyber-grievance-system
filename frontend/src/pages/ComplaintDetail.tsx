import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Phone, MapPin, Calendar,
  FileText, AlertTriangle, Shield, Brain,
} from "lucide-react";
import Badge, { severityVariant, statusVariant } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import InsightsPanel from "../components/ui/InsightsPanel";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

interface ComplaintDetailData {
  complaint_id: string;
  citizen_name: string;
  phone: string;
  location: string;
  date_of_incident: string;
  complaint_text: string;
  raw_text: string;
  crime_type: string;
  severity: string;
  severity_reason: string;
  confidence: number;
  summary: string;
  recommended_sections: string;
  status: string;
  created_at: string;
}

function EntityRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-semibold uppercase w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-mono">{String(value)}</span>
    </div>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ComplaintDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE_URL}/api/complaint/${id}/detail`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-gov-alert bg-red-50 border border-red-200 px-4 py-4 rounded">
        <AlertTriangle size={18} />
        Complaint not found or backend offline.
      </div>
    );
  }

  // Try to parse recommended_sections
  let sections: string[] = [];
  try { sections = JSON.parse(data.recommended_sections ?? "[]"); } catch { }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Complaint Detail</h1>
          <p className="text-xs font-mono text-gray-400">{data.complaint_id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data.severity && <Badge label={data.severity} variant={severityVariant(data.severity)} />}
          {data.status && <Badge label={data.status} variant={statusVariant(data.status)} />}
          <button
            onClick={() => setShowInsights(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gov-blue hover:bg-blue-900 px-3 py-2 rounded transition-all"
          >
            <Brain size={13} />
            AI Insights
          </button>
        </div>
      </div>

      {/* Citizen info */}
      <Card title="Citizen Information">
        <div className="grid grid-cols-2 gap-x-6">
          <EntityRow label={<><User size={12} className="inline mr-1"/>Name</>  as any} value={data.citizen_name} />
          <EntityRow label="Phone" value={data.phone} />
          <EntityRow label="Location" value={data.location} />
          <EntityRow label="Date of Incident" value={data.date_of_incident} />
          <EntityRow label="Submitted" value={data.created_at ? new Date(data.created_at).toLocaleString("en-IN") : ""} />
        </div>
      </Card>

      {/* Complaint text */}
      <Card title="Complaint Text">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {data.complaint_text || data.raw_text || "No text provided."}
        </p>
      </Card>

      {/* AI Analysis */}
      <Card title="AI Analysis">
        <div className="grid grid-cols-2 gap-x-6 mb-4">
          <EntityRow label="Crime Type" value={data.crime_type} />
          <EntityRow label="Severity" value={data.severity} />
          <EntityRow label="Confidence" value={data.confidence ? `${Math.round(data.confidence * 100)}%` : null} />
          <EntityRow label="Status" value={data.status} />
        </div>
        {data.severity_reason && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            <span className="font-semibold">Severity Reason: </span>{data.severity_reason}
          </div>
        )}
        {data.summary && (
          <div className="mt-3 bg-gov-bg border border-gray-200 rounded p-3 text-sm text-gray-700">
            <span className="font-semibold text-gray-500 uppercase text-xs">Summary: </span>
            <br />{data.summary}
          </div>
        )}
      </Card>

      {/* Legal sections */}
      {sections.length > 0 && (
        <Card title="Recommended Legal Sections">
          <div className="flex flex-wrap gap-2">
            {sections.map((s: string) => (
              <span key={s} className="text-xs font-medium bg-blue-50 text-gov-blue border border-blue-200 px-2.5 py-1.5 rounded">
                {s}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Insights side panel */}
      <InsightsPanel
        complaintId={showInsights ? data.complaint_id : null}
        onClose={() => setShowInsights(false)}
      />
    </div>
  );
}
