import { useEffect, useState, useCallback } from "react";
import { FileText, ShieldAlert, CheckCircle, Network, AlertTriangle, Search, Filter } from "lucide-react";
import { StatCard, Card } from "../components/ui/Card";
import CrimeBarChart from "../components/ui/CrimeBarChart";
import ComplaintTable from "../components/ui/ComplaintTable";
import InsightsPanel from "../components/ui/InsightsPanel";
import { api, DashboardStats, RecentComplaint } from "../services/api";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Day 87: Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterCrime, setFilterCrime] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, recentData] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentComplaints({
          query: appliedSearch,
          crime_type: filterCrime,
          severity: filterSeverity
        }, 50),
      ]);
      setStats(statsData);
      setRecent(recentData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, filterCrime, filterSeverity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time complaint intelligence — AI-powered analysis
          </p>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-gov-alert bg-red-50 border border-red-200 px-3 py-2 rounded">
            <AlertTriangle size={15} />
            Backend offline — showing cached data
          </div>
        )}
      </div>

      {/* ── Stat Cards (Day 80) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Complaints"
          value={stats?.total_complaints ?? 0}
          icon={FileText}
          loading={loading}
          iconColor="text-gov-primary"
        />
        <StatCard
          title="High Severity"
          value={stats?.high_severity ?? 0}
          icon={ShieldAlert}
          loading={loading}
          iconColor="text-gov-alert"
        />
        <StatCard
          title="Resolved"
          value={stats?.resolved ?? 0}
          icon={CheckCircle}
          loading={loading}
          iconColor="text-gov-success"
        />
        <StatCard
          title="Fraud Network Risk"
          value={
            stats
              ? `${Math.round((stats.high_severity / Math.max(stats.total_complaints, 1)) * 100)}%`
              : "—"
          }
          icon={Network}
          loading={loading}
          iconColor="text-gov-blue"
        />
      </div>

      {/* ── Day 81: Bar Chart + Crime Distribution row ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card title="Complaints by Crime Type (Bar Chart)" className="col-span-2">
          <CrimeBarChart data={stats?.crime_distribution ?? []} />
        </Card>
        <Card title="Severity Breakdown">
          <div className="space-y-3">
            {(stats?.severity_distribution ?? []).map((item) => {
              const total = stats?.total_complaints || 1;
              const pct = Math.round((item.count / total) * 100);
              const barColor =
                item.severity === "Critical" ? "bg-gov-primary"
                : item.severity === "High" ? "bg-gov-alert"
                : item.severity === "Medium" ? "bg-amber-400"
                : "bg-gov-success";
              return (
                <div key={item.severity}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{item.severity}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(stats?.severity_distribution ?? []).length === 0 && !loading && (
              <p className="text-sm text-gray-400 text-center py-4">No data yet.</p>
            )}
            {loading && [...Array(4)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      </div>

      {/* ── Day 87: Search + Filter Bar ── */}
      <div className="bg-white border border-gray-200 rounded p-3 flex items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 font-medium text-sm border-r border-gray-200 pr-4">
          <Filter size={16} /> Filters
        </div>
        
        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 focus-within:border-gov-blue transition-colors">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Semantic search (e.g. 'OTP stolen from bank account')"
            className="bg-transparent border-none outline-none text-sm w-full text-gray-800 placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setAppliedSearch(searchQuery);
              }
            }}
          />
        </div>

        <select 
          className="text-sm border border-gray-200 bg-white rounded px-3 py-1.5 outline-none focus:border-gov-blue"
          value={filterCrime}
          onChange={(e) => setFilterCrime(e.target.value)}
        >
          <option value="All">All Crimes</option>
          <option value="Financial Fraud">Financial Fraud</option>
          <option value="Phishing/Fraud">Phishing/Fraud</option>
          <option value="Ransomware/Hacking">Ransomware/Hacking</option>
          <option value="Identity Theft">Identity Theft</option>
          <option value="Cyberbullying">Cyberbullying</option>
          <option value="UPI/OTP Scam">UPI/OTP Scam</option>
        </select>

        <select 
          className="text-sm border border-gray-200 bg-white rounded px-3 py-1.5 outline-none focus:border-gov-blue"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <button 
          onClick={() => setAppliedSearch(searchQuery)}
          className="bg-gov-primary hover:bg-red-800 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
        >
          Search
        </button>
      </div>

      {/* ── Day 82: Paginated Complaint Table ── */}
      <Card title={`All Complaints ${recent.length ? `(${recent.length})` : ''}`}>
        <ComplaintTable
          complaints={recent}
          loading={loading}
          onInsights={(id) => setSelectedId(id)}
        />
      </Card>

      {/* ── Day 83: Insights Side Panel ── */}
      <InsightsPanel
        complaintId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
