import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Phone, MapPin, Calendar,
  FileText, AlertTriangle, Download, X, Brain, MessageSquare, CheckCircle, Clock, Wand2, Loader2
} from "lucide-react";
import jsPDF from "jspdf";
import Badge, { severityVariant, statusVariant } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import InsightsPanel from "../components/ui/InsightsPanel";
import ReplyModal from "../components/ui/ReplyModal";
import { api } from "../services/api";

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
  reply_text: string | null;
  status: string;
  created_at: string;
}

function EntityRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 font-semibold uppercase">{label}</span>
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
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [officerNotes, setOfficerNotes] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingDecision, setGeneratingDecision] = useState(false);

  const generateDecision = async () => {
    if (!data) return;
    setGeneratingDecision(true);
    try {
      const res = await api.getDecisionDraft(data.complaint_id);
      setOfficerNotes(res.draft);
    } catch (err) {
      console.error("Failed to generate decision draft:", err);
    } finally {
      setGeneratingDecision(false);
    }
  };

  const fetchDetail = () => {
    if (!id) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/complaint/${id}/detail`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
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

  const generatePDF = async () => {
    setGeneratingReport(true);
    try {
      const insightsData = await fetch(`${BASE_URL}/api/complaint/${data.complaint_id}/insights`).then(r => r.json());
      
      const doc = new jsPDF();
      let y = 20;
      
      doc.setFontSize(18);
      doc.setTextColor(183, 32, 46);
      doc.text("Cyber Grievance Investigation Report", 14, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Complaint ID: ${data.complaint_id}`, 14, y);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 120, y);
      y += 15;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Abstract / Summary", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const summaryLines = doc.splitTextToSize(data.summary || data.complaint_text, 180);
      doc.text(summaryLines, 14, y);
      y += (summaryLines.length * 5) + 10;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("AI Classification", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Crime Type: ${data.crime_type}`, 14, y);
      doc.text(`Severity: ${data.severity}`, 100, y);
      y += 6;
      doc.text(`Confidence: ${data.confidence ? Math.round(data.confidence * 100) + '%' : 'N/A'}`, 14, y);
      doc.text(`Status: ${data.status}`, 100, y);
      y += 15;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("AI Suggestions & Recommended Actions", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      
      if (insightsData.insights?.suggested_actions?.length > 0) {
        insightsData.insights.suggested_actions.forEach((action: string) => {
          const actionLines = doc.splitTextToSize(`• ${action}`, 180);
          doc.text(actionLines, 14, y);
          y += (actionLines.length * 5) + 2;
        });
      } else {
        doc.text("No specific AI actions suggested.", 14, y);
        y += 6;
      }
      y += 10;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Officer Final Decision & Notes", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      
      const notesLines = doc.splitTextToSize(officerNotes || "No additional notes provided by the officer.", 180);
      doc.text(notesLines, 14, y);
      
      doc.save(`${data.complaint_id}_Report.pdf`);
      setShowReportModal(false);
      setOfficerNotes("");
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Make sure the backend is reachable.");
    } finally {
      setGeneratingReport(false);
    }
  };

  let sections: string[] = [];
  try { sections = JSON.parse(data.recommended_sections ?? "[]"); } catch { }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Complaint Record</h1>
          <p className="text-xs font-mono text-gray-400 mt-0.5">{data.complaint_id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data.severity && <Badge label={data.severity} variant={severityVariant(data.severity)} />}
          {data.status && <Badge label={data.status} variant={statusVariant(data.status)} />}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Main Content */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <Card title="Citizen Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <EntityRow label="Name" value={data.citizen_name} />
              <EntityRow label="Phone" value={data.phone} />
              <EntityRow label="Location" value={data.location} />
              <EntityRow label="Date of Incident" value={data.date_of_incident} />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
              <Calendar size={12} />
              Submitted on {data.created_at ? new Date(data.created_at).toLocaleString("en-IN") : "Unknown"}
            </div>
          </Card>

          <Card title="Complaint Text">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {data.complaint_text || data.raw_text || "No text provided."}
            </p>
          </Card>

          <Card title="Officer Reply" className="flex-grow">
            {data.reply_text ? (
              <div className="bg-[#F3F4E5]/40 border border-[#F3F4E5] rounded p-4 flex-grow">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-2">
                  <CheckCircle size={16} />
                  Reply Sent to Citizen
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.reply_text}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded p-6 flex flex-col items-center justify-center text-center flex-grow">
                <Clock size={24} className="text-gray-300 mb-2" />
                <h4 className="text-sm font-semibold text-gray-700">Reply Not Sent</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  This complaint has not been responded to yet. Use the "Reply to Citizen" button to generate a draft.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar (Actions & Analysis) */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowReplyModal(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gov-primary hover:bg-red-800 py-2.5 rounded transition-all"
              >
                <MessageSquare size={16} />
                Reply to Citizen
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 py-2.5 rounded transition-all"
              >
                <Download size={16} />
                Export Investigation Report
              </button>
            </div>
          </Card>

          {/* Initial Assessment */}
          <Card title="Initial AI Assessment">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <EntityRow label="Crime Type" value={data.crime_type} />
              <EntityRow label="Severity" value={data.severity} />
              <EntityRow label="Confidence" value={data.confidence ? `${Math.round(data.confidence * 100)}%` : null} />
              <EntityRow label="Status" value={data.status} />
            </div>
            
            {data.severity_reason && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-3">
                <span className="font-semibold block mb-1">Severity Reason:</span>
                {data.severity_reason}
              </div>
            )}
            
            {data.summary && (
              <div className="bg-gov-bg border border-gray-200 rounded p-3 text-sm text-gray-700">
                <span className="font-semibold text-gray-500 uppercase text-xs block mb-1">Summary:</span>
                {data.summary}
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

          {/* Deep Insights Trigger */}
          <Card title="Deep Investigation">
            <div className="bg-blue-50/50 border border-blue-100 rounded p-4 text-center">
              <Brain size={24} className="text-gov-blue mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-semibold text-gray-800">Advanced AI Insights</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Run the RAG pipeline to discover similar past cases and get step-by-step investigation recommendations.
              </p>
              <button
                onClick={() => setShowInsights(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gov-blue hover:bg-blue-900 py-2 rounded transition-all"
              >
                <Brain size={14} />
                Generate Deep Analysis
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Insights side panel */}
      <InsightsPanel
        complaintId={showInsights ? data.complaint_id : null}
        onClose={() => setShowInsights(false)}
      />

      {/* Reply Modal */}
      {showReplyModal && (
        <ReplyModal 
          complaintId={data.complaint_id}
          onClose={() => setShowReplyModal(false)}
          onSuccess={() => {
            fetchDetail(); // Refresh data to show sent reply
          }}
        />
      )}

      {/* Export Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-gov-primary" />
                Generate Investigation Report
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                This will generate a formal PDF report including the AI abstract, classification details, and recommended actions.
              </p>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-800">
                    Officer Final Decision / Notes
                  </label>
                  <button
                    onClick={generateDecision}
                    disabled={generatingDecision}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gov-blue hover:text-blue-800 transition-colors disabled:opacity-50"
                  >
                    {generatingDecision ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {generatingDecision ? "Generating..." : "Generate Draft with AI"}
                  </button>
                </div>
                <textarea
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder="Enter final decision, actions taken, or remarks for the record..."
                  className="w-full border border-gray-300 rounded p-3 text-sm focus:border-gov-primary focus:ring-1 focus:ring-gov-primary outline-none min-h-[120px]"
                />
              </div>
            </div>
            
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded transition-colors"
                disabled={generatingReport}
              >
                Cancel
              </button>
              <button
                onClick={generatePDF}
                disabled={generatingReport}
                className="px-4 py-2 text-sm font-semibold text-white bg-gov-primary hover:bg-red-800 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {generatingReport ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Download size={16} />
                )}
                {generatingReport ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
