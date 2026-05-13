import { useEffect, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  Calendar,
  TrendingUp,
  FileWarning,
} from "lucide-react";
import { api, OfficerReport as OfficerReportData, OfficerReportEntry, WeeklyBreakdown } from "../services/api";

const WEEK_OPTIONS = [2, 4, 8, 12];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-300",
  High: "bg-orange-100 text-orange-700 border-orange-300",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Low: "bg-green-100 text-green-700 border-green-300",
  Unknown: "bg-gray-100 text-gray-600 border-gray-300",
};

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-lg border ${color}`}>
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="text-[11px] font-semibold mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

function WeekRow({ week }: { week: WeeklyBreakdown }) {
  const [expanded, setExpanded] = useState(false);
  const total = week.total;
  const solvedPct = total ? Math.round((week.solved / total) * 100) : 0;
  const processedPct = total ? Math.round((week.processed / total) * 100) : 0;
  const pendingPct = total ? Math.round((week.pending / total) * 100) : 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Week header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <Calendar size={14} className="text-gov-blue flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700 w-36 flex-shrink-0">
          {week.week_label}
        </span>

        {/* Progress bar */}
        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden flex">
          {solvedPct > 0 && (
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${solvedPct}%` }}
              title={`Solved: ${week.solved}`}
            />
          )}
          {processedPct > 0 && (
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${processedPct}%` }}
              title={`Processed: ${week.processed}`}
            />
          )}
          {pendingPct > 0 && (
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${pendingPct}%` }}
              title={`Pending: ${week.pending}`}
            />
          )}
        </div>

        <div className="flex gap-3 items-center text-xs font-medium flex-shrink-0">
          <span className="text-green-700">✓ {week.solved}</span>
          <span className="text-blue-700">⚙ {week.processed}</span>
          <span className="text-amber-600">⏳ {week.pending}</span>
          <span className="text-gray-400">/ {total}</span>
        </div>

        {week.pending > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="ml-2 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{expanded ? "Hide" : "View"} reasons</span>
          </button>
        )}
      </div>

      {/* Pending reasons drill-down */}
      {expanded && week.pending_items.length > 0 && (
        <div className="border-t border-amber-100 bg-amber-50 divide-y divide-amber-100">
          {week.pending_items.map((item, idx) => (
            <div key={idx} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <FileWarning size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-gray-800">
                      {item.citizen_name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      #{item.complaint_id.slice(0, 8)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.Unknown
                        }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      {item.crime_type}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">{item.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OfficerCard({ officer }: { officer: OfficerReportEntry }) {
  const [collapsed, setCollapsed] = useState(false);
  const resolutionRate =
    officer.total_complaints > 0
      ? Math.round((officer.total_solved / officer.total_complaints) * 100)
      : 0;

  const rateColor =
    resolutionRate >= 70
      ? "text-green-600"
      : resolutionRate >= 40
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
      {/* Officer header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gov-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {officer.officer_name.split(" ").slice(-1)[0]?.[0] || "O"}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{officer.officer_name}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {officer.crime_specialization.join(", ") || "General Crimes"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-lg font-bold ${rateColor}`}>{resolutionRate}%</p>
            <p className="text-[10px] text-gray-400">Resolution Rate</p>
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
        <StatPill
          label="Solved"
          value={officer.total_solved}
          color="border-green-200 bg-green-50 text-green-700"
        />
        <StatPill
          label="Processed"
          value={officer.total_processed}
          color="border-blue-200 bg-blue-50 text-blue-700"
        />
        <StatPill
          label="Pending"
          value={officer.total_pending}
          color="border-amber-200 bg-amber-50 text-amber-700"
        />
        <StatPill
          label="Total"
          value={officer.total_complaints}
          color="border-gray-200 bg-white text-gray-700"
        />
      </div>

      {/* Weekly breakdown */}
      {!collapsed && (
        <div className="px-5 py-4 space-y-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp size={12} /> Weekly Breakdown
          </p>
          {officer.weekly_breakdown.map((week) => (
            <WeekRow key={week.week_label} week={week} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficerReport() {
  const [data, setData] = useState<OfficerReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(4);

  const fetchReport = async (w: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getOfficerReport(w);
      setData(result);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(weeks);
  }, [weeks]);

  const totalOfficers = data?.officers.length ?? 0;
  const totalSolved = data?.officers.reduce((s, o) => s + o.total_solved, 0) ?? 0;
  const totalPending = data?.officers.reduce((s, o) => s + o.total_pending, 0) ?? 0;
  const totalComplaints = data?.officers.reduce((s, o) => s + o.total_complaints, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-gov-primary" />
            Officer Weekly Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Week-wise complaint resolution status by assigned officer
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week selector */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">View:</span>
            {WEEK_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${weeks === w
                    ? "bg-gov-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {w}W
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchReport(weeks)}
            disabled={loading}
            className="flex items-center gap-2 text-sm bg-gov-primary hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Active Officers",
            value: totalOfficers,
            icon: UserCheck,
            color: "text-gov-blue",
            bg: "bg-blue-50",
            border: "border-blue-200",
          },
          {
            label: "Total Complaints",
            value: totalComplaints,
            icon: ClipboardList,
            color: "text-gray-700",
            bg: "bg-gray-50",
            border: "border-gray-200",
          },
          {
            label: "Resolved",
            value: totalSolved,
            icon: CheckCircle2,
            color: "text-green-700",
            bg: "bg-green-50",
            border: "border-green-200",
          },
          {
            label: "Pending",
            value: totalPending,
            icon: AlertTriangle,
            color: "text-amber-700",
            bg: "bg-amber-50",
            border: "border-amber-200",
          },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`flex items-center gap-3 ${bg} border ${border} rounded-xl px-4 py-3 shadow-sm`}
          >
            <Icon size={22} className={color} />
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Solved / Resolved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Processed / In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Pending (click to see reasons)
        </span>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={24} className="animate-spin mr-3" />
          <span className="text-sm font-medium">Loading officer report…</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {!loading && !error && data && data.officers.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-10 text-center text-gray-400">
          <Clock size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No complaints found for the selected period</p>
          <p className="text-xs mt-1">Try increasing the week range using the selector above</p>
        </div>
      )}

      {!loading && !error && data && data.officers.length > 0 && (
        <div className="space-y-5">
          {data.officers.map((officer) => (
            <OfficerCard key={officer.officer_name} officer={officer} />
          ))}
        </div>
      )}

      {data?.generated_at && (
        <p className="text-[11px] text-gray-400 text-right">
          Report generated at{" "}
          {new Date(data.generated_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
    </div>
  );
}
