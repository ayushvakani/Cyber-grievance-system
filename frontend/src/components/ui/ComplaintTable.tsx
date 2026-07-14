import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Brain, MessageSquare } from "lucide-react";
import Badge, { severityVariant, statusVariant } from "./Badge";
import { RecentComplaint } from "../../services/api";
import ReplyModal from "./ReplyModal";

interface ComplaintTableProps {
  complaints: RecentComplaint[];
  loading: boolean;
  onInsights: (id: string) => void;
  onRefresh?: () => void;
}

const PAGE_SIZE = 10;

export default function ComplaintTable({ complaints, loading, onInsights, onRefresh }: ComplaintTableProps) {
  const [page, setPage] = useState(0);
  const [replyId, setReplyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const safeComplaints = Array.isArray(complaints) ? complaints : [];
  const totalPages = Math.ceil(safeComplaints.length / PAGE_SIZE);
  const paged = safeComplaints.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (safeComplaints.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No complaints found.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b-2 border-gov-primary">
              <th className="pb-2 pr-3 font-semibold">ID</th>
              <th className="pb-2 pr-3 font-semibold">Citizen</th>
              <th className="pb-2 pr-3 font-semibold">Crime Type</th>
              <th className="pb-2 pr-3 font-semibold">Severity</th>
              <th className="pb-2 pr-3 font-semibold">Status</th>
              <th className="pb-2 pr-3 font-semibold">Reply</th>
              <th className="pb-2 pr-3 font-semibold">Date</th>
              <th className="pb-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => (
              <tr
                key={c.complaint_id}
                className="border-b border-gray-50 hover:bg-red-50 transition-colors duration-100 cursor-pointer"
                onClick={() => navigate(`/admin/complaints/${c.complaint_id}`)}
              >
                <td className="py-3 pr-3 font-mono text-xs text-gov-blue">{c.complaint_id}</td>
                <td className="py-3 pr-3 font-medium text-gray-800 max-w-[120px] truncate">{c.citizen_name}</td>
                <td className="py-3 pr-3">
                  {c.crime_type ? (
                    <Badge label={c.crime_type} variant="default" />
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-3">
                  {c.severity ? (
                    <Badge label={c.severity} variant={severityVariant(c.severity)} />
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-3">
                  {c.status ? (
                    <Badge label={c.status} variant={statusVariant(c.status)} />
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-3">
                  {c.reply_text ? (
                    <div 
                      className="text-xs text-gray-700 max-w-[150px] truncate border-l-2 border-green-500 pl-2 bg-green-50/50 py-1"
                      title={c.reply_text}
                    >
                      {c.reply_text}
                    </div>
                  ) : (
                    <span className="text-xs text-red-500/80 bg-red-50 px-2 py-0.5 rounded border border-red-100">Not sent</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-xs text-gray-500">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInsights(c.complaint_id);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-gov-blue bg-blue-50 hover:bg-gov-blue hover:text-white px-2.5 py-1.5 rounded border border-blue-200 hover:border-gov-blue transition-all duration-150"
                    >
                      <Brain size={12} />
                      Insights
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyId(c.complaint_id);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-200 hover:text-gray-900 px-2.5 py-1.5 rounded border border-gray-200 transition-all duration-150"
                    >
                      <MessageSquare size={12} />
                      Reply
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, safeComplaints.length)} of {safeComplaints.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-gray-600 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      
      {replyId && (
        <ReplyModal 
          complaintId={replyId} 
          onClose={() => setReplyId(null)} 
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }} 
        />
      )}
    </div>
  );
}
