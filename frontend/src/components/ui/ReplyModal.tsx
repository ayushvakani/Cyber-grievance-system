import React, { useState, useEffect } from "react";
import { X, Send, Loader2, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

interface ReplyModalProps {
  complaintId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReplyModal({ complaintId, onClose, onSuccess }: ReplyModalProps) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (complaintId) {
      loadDraft(complaintId);
    }
  }, [complaintId]);

  const loadDraft = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReplyDraft(id);
      setDraft(res.draft);
    } catch (err: any) {
      setError(err.message || "Failed to generate reply draft.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!complaintId) return;
    setSending(true);
    setError(null);
    try {
      await api.sendReply(complaintId, draft);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (!complaintId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reply to Citizen</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {complaintId}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col relative min-h-[300px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-8 h-8 text-gov-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-600 animate-pulse">Drafting AI Reply...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="text-red-500 bg-red-50 p-4 rounded-full">
                <X size={32} />
              </div>
              <p className="text-sm text-gray-600 max-w-sm">{error}</p>
              <button 
                onClick={() => loadDraft(complaintId)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gov-primary bg-red-50 hover:bg-red-100 rounded transition-colors"
              >
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Edit Draft Message
              </label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full flex-1 min-h-[200px] p-4 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue resize-none transition-colors"
                placeholder="Type your message to the citizen here..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || sending || !draft.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gov-primary hover:bg-red-800 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Reply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
