import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Brain, CheckCircle, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { api } from "../../services/api";

interface InsightsPanelProps {
  complaintId: string | null;
  onClose: () => void;
}

const verdictStyle = (verdict: string) => {
  if (verdict === "CORRECT") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (verdict === "AMBIGUOUS") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-800 border-red-300";
};

const verdictIcon = (verdict: string) => {
  if (verdict === "CORRECT") return <CheckCircle size={14} />;
  if (verdict === "AMBIGUOUS") return <AlertTriangle size={14} />;
  return <AlertTriangle size={14} />;
};

export default function InsightsPanel({ complaintId, onClose }: InsightsPanelProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!complaintId) return;
    setLoading(true);
    setData(null);
    setError(null);
    setStreamedText("");
    setIsGenerating(false);

    api.streamComplaintInsights(
      complaintId,
      (chunk) => {
        if (chunk.type === "metadata") {
          setData(chunk);
          setLoading(false);
          setIsGenerating(true);
        } else if (chunk.type === "chunk") {
          setStreamedText((prev) => prev + chunk.content);
        } else if (chunk.type === "error") {
          setError(chunk.content);
          setLoading(false);
          setIsGenerating(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
        setIsGenerating(false);
      }
    ).finally(() => {
      setIsGenerating(false);
    });
  }, [complaintId]);

  if (!complaintId) return null;

  const insights = data?.insights ?? {};
  const verdict = data?.crag_verdict ?? "";
  const avgScore = data?.crag_avg_score ?? 0;
  const confidence = insights?.confidence_score ?? 0;
  const fraudAlert = insights?.fraud_network_alert;

  // Extract from streamed text
  const recMatch = streamedText.match(/RECOMMENDATION:?\*?\*?\n?([\s\S]*?)(?:\n\n\s*\*?\*?ACTIONS:|$)/i);
  const actMatch = streamedText.match(/ACTIONS:?\*?\*?\n?([\s\S]*?)$/i);
  
  let officer_recommendation = "";
  if (recMatch) {
      officer_recommendation = recMatch[1].trim().replace(/\*\*/g, '');
  } else if (streamedText.length > 0 && !actMatch) {
      // If we have text but no matches yet, just show the text being streamed
      officer_recommendation = streamedText.replace(/\*\*/g, '');
  } else {
      officer_recommendation = insights?.officer_recommendation || (isGenerating ? "Generating recommendation..." : "No recommendation generated.");
  }

  const suggested_actions = actMatch ? actMatch[1].split('\n').map(s => s.replace(/^[-\*]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean) : (insights?.suggested_actions || []);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[440px] bg-white shadow-2xl z-50 flex flex-col border-l-4 border-gov-primary overflow-hidden">
        {/* Header */}
        <div className="bg-gov-primary text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Brain size={18} />
            <div>
              <p className="font-bold text-sm">AI Insights Panel</p>
              <p className="text-xs opacity-75 font-mono">{complaintId}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-red-800 rounded p-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="text-gov-primary animate-spin" />
              <p className="text-sm text-gray-500 animate-pulse">Generating insights...</p>
              <p className="text-xs text-gray-400">Running Graph RAG + CRAG pipeline</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-gov-alert bg-red-50 border border-red-200 px-4 py-3 rounded">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* CRAG Verdict */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">CRAG Verdict</p>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold ${verdictStyle(verdict)}`}>
                    {verdictIcon(verdict)}
                    {verdict}
                  </span>
                  <span className="text-xs text-gray-500">
                    Avg relevance: <span className="font-semibold text-gray-700">{(avgScore * 100).toFixed(0)}%</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Confidence: <span className="font-semibold text-gov-blue">{(confidence * 100).toFixed(0)}%</span>
                  </span>
                </div>
              </div>

              {/* Fraud Network Alert */}
              {fraudAlert && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-3 rounded text-sm text-gov-alert font-semibold">
                  <AlertTriangle size={16} />
                  Fraud Network Detected — possible organised gang involvement
                </div>
              )}

              {/* Officer Recommendation */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">Officer Recommendation</p>
                <div className="bg-gov-bg border border-gray-200 rounded p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {officer_recommendation}
                </div>
              </div>

              {/* Suggested Actions */}
              {suggested_actions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">Suggested Actions</p>
                  <ul className="space-y-2">
                    {suggested_actions.map((action: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <ChevronRight size={14} className="text-gov-primary mt-0.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Case IDs */}
              {insights?.related_case_ids?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">Related Cases</p>
                  <div className="flex flex-wrap gap-2">
                    {insights.related_case_ids.map((id: string) => (
                      <button 
                        key={id} 
                        onClick={() => {
                          onClose();
                          navigate(`/admin/complaints/${id}`);
                        }}
                        className="text-xs font-mono bg-blue-50 text-gov-blue border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
