import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api, RecentComplaint, ComplaintFilters } from "../services/api";
import Badge, { severityVariant } from "../components/ui/Badge";

const PAGE_SIZE = 15;

const crimeTypes = [
  "All",
  "Financial Fraud",
  "Phishing",
  "Ransomware",
  "Identity Theft",
  "Cyberbullying",
  "Social Media Fraud",
  "Data Breach",
];

const severities = ["All", "Critical", "High", "Medium", "Low"];
const statuses   = ["All", "pending", "in_review", "resolved"];

function statusLabel(s: string) {
  return s === "in_review" ? "In Review" : s.charAt(0).toUpperCase() + s.slice(1);
}
function statusColor(s: string) {
  if (s === "resolved")  return "bg-green-100 text-green-700";
  if (s === "in_review") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<RecentComplaint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);

  // Filters
  const [search,      setSearch]      = useState("");
  const [crimeFilter, setCrimeFilter] = useState("All");
  const [sevFilter,   setSevFilter]   = useState("All");
  const [statFilter,  setStatFilter]  = useState("All");

  const load = useCallback(async (filters: ComplaintFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecentComplaints(filters, 200);
      setComplaints(data);
      setPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ query: search, crime_type: crimeFilter, severity: sevFilter });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side status filter (not a query param yet)
  const visible = statFilter === "All"
    ? complaints
    : complaints.filter((c) => c.status === statFilter);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageData   = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = () => {
    load({ query: search, crime_type: crimeFilter, severity: sevFilter });
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Complaints</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse, search and filter all registered cyber-crime complaints
          </p>
        </div>
        <button
          onClick={() => load({ query: search, crime_type: crimeFilter, severity: sevFilter })}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gov-primary transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border border-gray-200 rounded-md p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium border-r border-gray-200 pr-3">
          <Filter size={15} /> Filters
        </div>

        {/* Semantic search */}
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 focus-within:border-gov-blue transition-colors">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Semantic search…"
            className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        {/* Crime type */}
        <select
          className="text-sm border border-gray-200 bg-white rounded px-3 py-1.5 outline-none focus:border-gov-blue"
          value={crimeFilter}
          onChange={(e) => setCrimeFilter(e.target.value)}
        >
          {crimeTypes.map((t) => <option key={t}>{t}</option>)}
        </select>

        {/* Severity */}
        <select
          className="text-sm border border-gray-200 bg-white rounded px-3 py-1.5 outline-none focus:border-gov-blue"
          value={sevFilter}
          onChange={(e) => setSevFilter(e.target.value)}
        >
          {severities.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Status (client-side) */}
        <select
          className="text-sm border border-gray-200 bg-white rounded px-3 py-1.5 outline-none focus:border-gov-blue"
          value={statFilter}
          onChange={(e) => setStatFilter(e.target.value)}
        >
          {statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>

        <button
          onClick={handleSearch}
          className="bg-gov-primary hover:bg-red-800 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
        >
          Search
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-gov-alert bg-red-50 border border-red-200 px-4 py-2.5 rounded">
          <AlertTriangle size={15} />
          Backend offline — could not load complaints
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {loading ? "Loading…" : `${visible.length} complaint${visible.length !== 1 ? "s" : ""}`}
          </span>
          <span className="text-xs text-gray-400">
            Page {page} / {totalPages}
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5">ID</th>
              <th className="text-left px-4 py-2.5">Citizen</th>
              <th className="text-left px-4 py-2.5">Crime Type</th>
              <th className="text-left px-4 py-2.5">Severity</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Summary</th>
              <th className="text-left px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading skeleton */}
            {loading && [...Array(PAGE_SIZE)].map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}

            {/* Empty state */}
            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <FileText size={36} className="mx-auto mb-2 opacity-30" />
                  No complaints match your filters.
                </td>
              </tr>
            )}

            {/* Rows */}
            {!loading && pageData.map((c) => (
              <tr
                key={c.complaint_id}
                onClick={() => navigate(`/admin/complaints/${c.complaint_id}`)}
                className="border-b border-gray-50 hover:bg-[#F3F4E5]/60 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-400 group-hover:text-gov-primary transition-colors">
                  {c.complaint_id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{c.citizen_name || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.crime_type || "—"}</td>
                <td className="px-4 py-3">
                  <Badge label={c.severity || "—"} variant={severityVariant(c.severity)} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[260px] truncate">
                  {c.summary || "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {!loading && visible.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gov-primary transition-colors"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 text-xs rounded font-semibold transition-colors ${
                    page === i + 1
                      ? "bg-gov-primary text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gov-primary transition-colors"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
