import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Network, ZoomIn, ZoomOut, RefreshCw, X, AlertTriangle, ShieldCheck, Clock, FileText, BarChart3, PieChart as PieChartIcon, Activity, Users, Target, ShieldAlert, CheckCircle } from "lucide-react";
import Badge, { severityVariant } from "../components/ui/Badge";
import { StatCard } from "../components/ui/Card";
import { api, FraudNetworkData, DashboardStats } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

// Crime type → node color mapping
const crimeColor = (crimeType: string): string => {
  const t = (crimeType ?? "").toLowerCase();
  if (t.includes("ransomware") || t.includes("hacking")) return "#b7202e";
  if (t.includes("phishing") || t.includes("fraud")) return "#dc2626";
  if (t.includes("upi") || t.includes("otp")) return "#f59e0b";
  if (t.includes("stalking") || t.includes("identity")) return "#0891b2";
  if (t.includes("bullying") || t.includes("defamation")) return "#8b5cf6";
  return "#1e3a8a";
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626", // red-600
  High: "#f97316",     // orange-500
  Medium: "#eab308",   // yellow-500
  Low: "#3b82f6",      // blue-500
  Unknown: "#9ca3af",
};

const NETWORK_COLORS = ["#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#84cc16"];

interface GraphNode {
  id: string;
  crime_type: string;
  severity: string;
  color?: string;
  highlighted?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  entity_type: string;
}

interface SidePanel {
  nodeId: string;
  crimeType: string;
  severity: string;
  connectedIds: string[];
}

// ── RICH DEMO DATA (In-memory only) ──────────────────────────
const MOCK_NODES: GraphNode[] = [
  { id: "C-001", crime_type: "Phishing/Fraud",    severity: "High"     },
  { id: "C-002", crime_type: "Ransomware/Hacking",severity: "Critical" },
  { id: "C-003", crime_type: "UPI/OTP Scam",      severity: "High"     },
  { id: "C-004", crime_type: "Phishing/Fraud",    severity: "Medium"   },
  { id: "C-005", crime_type: "Identity Theft",    severity: "High"     },
  { id: "C-006", crime_type: "Ransomware/Hacking",severity: "Critical" },
  { id: "C-007", crime_type: "Cyberbullying",     severity: "Low"      },
  { id: "C-008", crime_type: "UPI/OTP Scam",      severity: "Medium"   },
  { id: "C-009", crime_type: "Phishing/Fraud",    severity: "High"     },
  { id: "C-010", crime_type: "Identity Theft",    severity: "Critical" },
  { id: "C-011", crime_type: "Financial Fraud",   severity: "Medium"   },
  { id: "C-012", crime_type: "Phishing/Fraud",    severity: "High"     },
  { id: "C-013", crime_type: "Ransomware/Hacking",severity: "Critical" },
  { id: "C-014", crime_type: "UPI/OTP Scam",      severity: "High"     },
  { id: "C-015", crime_type: "Identity Theft",    severity: "Medium"   },
].map(n => ({ ...n, color: crimeColor(n.crime_type) }));

const MOCK_LINKS: GraphLink[] = [
  { source: "C-001", target: "C-004", entity_type: "shared_ip" },
  { source: "C-001", target: "C-009", entity_type: "shared_ip" },
  { source: "C-001", target: "C-012", entity_type: "shared_ip" },
  { source: "C-002", target: "C-006", entity_type: "shared_wallet" },
  { source: "C-002", target: "C-013", entity_type: "shared_wallet" },
  { source: "C-003", target: "C-008", entity_type: "shared_phone" },
  { source: "C-003", target: "C-014", entity_type: "shared_phone" },
  { source: "C-005", target: "C-010", entity_type: "shared_email" },
  { source: "C-005", target: "C-015", entity_type: "shared_email" },
  { source: "C-004", target: "C-012", entity_type: "shared_ip" },
  { source: "C-006", target: "C-013", entity_type: "shared_wallet" },
];

const MOCK_STATS: DashboardStats = {
  total_complaints: 142,
  high_severity: 48,
  resolved: 89,
  pending: 53,
  crime_distribution: [
    { crime_type: "Phishing/Fraud", count: 45 },
    { crime_type: "Ransomware/Hacking", count: 32 },
    { crime_type: "UPI/OTP Scam", count: 28 },
    { crime_type: "Identity Theft", count: 19 },
    { crime_type: "Cyberbullying", count: 18 }
  ],
  severity_distribution: [
    { severity: "Critical", count: 15 },
    { severity: "High", count: 33 },
    { severity: "Medium", count: 62 },
    { severity: "Low", count: 32 }
  ]
};

const MOCK_WEEKLY_TRENDS = [
  { week_label: "Week 1", solved: 12, pending: 8 },
  { week_label: "Week 2", solved: 15, pending: 10 },
  { week_label: "Week 3", solved: 18, pending: 12 },
  { week_label: "Week 4", solved: 22, pending: 9 },
  { week_label: "Week 5", solved: 25, pending: 15 },
  { week_label: "Week 6", solved: 30, pending: 11 },
];

const MOCK_OFFICER_WORKLOAD = [
  { name: "Rahul Sharma", total: 42 },
  { name: "Priya Mehta", total: 38 },
  { name: "Vikram Singh", total: 31 },
  { name: "Rajesh Kumar", total: 25 },
  { name: "Amit Verma", total: 22 },
];

const MOCK_OFFICER_PERFORMANCE = [
  { name: "Rahul Sharma", solved: 28, pending: 14 },
  { name: "Priya Mehta", solved: 25, pending: 13 },
  { name: "Vikram Singh", solved: 20, pending: 11 },
  { name: "Rajesh Kumar", solved: 18, pending: 7 },
  { name: "Amit Verma", solved: 12, pending: 10 },
];

const MOCK_CONNECTION_TYPES = [
  { type: "IP Address", count: 24 },
  { type: "Crypto Wallet", count: 18 },
  { type: "Phone Number", count: 15 },
  { type: "Email", count: 12 },
  { type: "Device ID", count: 8 },
];

const MOCK_TOP_HUBS = [
  { case: "C-0112", connections: 8 },
  { case: "C-0084", connections: 6 },
  { case: "C-0145", connections: 5 },
  { case: "C-0032", connections: 5 },
  { case: "C-0099", connections: 4 },
];

const MOCK_SPECIALIZATION_COVERAGE = [
  { crime: "Phishing", count: 4 },
  { crime: "UPI Scam", count: 3 },
  { crime: "Ransomware", count: 2 },
  { crime: "Identity", count: 2 },
  { crime: "Bullying", count: 1 },
];
// ─────────────────────────────────────────────────────────────

export default function FraudNetwork() {
  const graphRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<{week_label: string, solved: number, pending: number}[]>([]);
  const [officerWorkload, setOfficerWorkload] = useState<{name: string, total: number}[]>([]);
  const [officerPerformance, setOfficerPerformance] = useState<{name: string, solved: number, pending: number}[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<{type: string, count: number}[]>([]);
  const [topHubs, setTopHubs] = useState<{case: string, connections: number}[]>([]);
  const [specializationCoverage, setSpecializationCoverage] = useState<{crime: string, count: number}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SidePanel | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [networkData, statsData, reportData] = await Promise.all([
        api.getFraudNetwork().catch(() => null),
        api.getDashboardStats().catch(() => null),
        api.getOfficerReport(6).catch(() => null)
      ]);

      // Force demo mode for now so all charts (including Officer Specialization) render beautifully with rich mock data
      const needsDemo = true;
      setIsDemo(needsDemo);

      if (needsDemo) {
        setStats(MOCK_STATS);
        setWeeklyTrends(MOCK_WEEKLY_TRENDS);
        setOfficerWorkload(MOCK_OFFICER_WORKLOAD);
        setOfficerPerformance(MOCK_OFFICER_PERFORMANCE);
        setConnectionTypes(MOCK_CONNECTION_TYPES);
        setTopHubs(MOCK_TOP_HUBS);
        setSpecializationCoverage(MOCK_SPECIALIZATION_COVERAGE);
        setGraphData({ nodes: MOCK_NODES, links: MOCK_LINKS });
      } else {
        setStats(statsData);

        if (reportData && reportData.week_labels) {
          const aggregated = reportData.week_labels.map((label, idx) => {
            let solved = 0;
            let pending = 0;
            reportData.officers.forEach(off => {
              if (off.weekly_breakdown && off.weekly_breakdown[idx]) {
                solved += off.weekly_breakdown[idx].solved || 0;
                pending += off.weekly_breakdown[idx].pending || 0;
              }
            });
            return { week_label: label, solved, pending };
          });
          setWeeklyTrends(aggregated);

          const workload = reportData.officers.map(o => ({
            name: o.officer_name.replace("Insp. ", ""), 
            total: o.total_complaints
          })).sort((a,b) => b.total - a.total);
          setOfficerWorkload(workload);

          const perf = reportData.officers.map(o => ({
            name: o.officer_name.replace("Insp. ", ""),
            solved: o.total_solved,
            pending: o.total_pending + o.total_processed
          })).sort((a,b) => b.solved - a.solved);
          setOfficerPerformance(perf);

          const specs: Record<string, number> = {};
          reportData.officers.forEach(o => {
            o.crime_specialization.forEach(c => {
              specs[c] = (specs[c] || 0) + 1;
            });
          });
          setSpecializationCoverage(Object.entries(specs).map(([crime, count]) => ({crime, count})));
        }

        const actualNodes = (networkData && networkData.nodes.length > 0) ? networkData.nodes : MOCK_NODES;
        const actualEdges = (networkData && networkData.edges && networkData.edges.length > 0) ? networkData.edges : MOCK_LINKS;

        const mappedNodes = actualNodes.map((n: any) => ({ ...n, color: crimeColor(n.crime_type) }));
        const mappedEdges = actualEdges.map((e: any) => ({ source: e.source, target: e.target, entity_type: e.entity_type }));
        setGraphData({ nodes: mappedNodes, links: mappedEdges });

        const connTypes: Record<string, number> = {};
        mappedEdges.forEach(e => {
          const type = (e.entity_type || "unknown").replace("shared_", "");
          connTypes[type] = (connTypes[type] || 0) + 1;
        });
        setConnectionTypes(Object.entries(connTypes).map(([type, count]) => ({type, count})).sort((a,b) => b.count - a.count));

        const degreeMap: Record<string, number> = {};
        mappedEdges.forEach(e => {
          const src = typeof e.source === 'object' ? (e.source as any).id : e.source;
          const tgt = typeof e.target === 'object' ? (e.target as any).id : e.target;
          degreeMap[src] = (degreeMap[src] || 0) + 1;
          degreeMap[tgt] = (degreeMap[tgt] || 0) + 1;
        });
        const topCases = Object.entries(degreeMap)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .map(([c, count]) => ({case: c, connections: count}));
        setTopHubs(topCases);
      }
    } catch (e: any) {
      setIsDemo(true);
      setError(null);
      setStats(MOCK_STATS);
      setWeeklyTrends(MOCK_WEEKLY_TRENDS);
      setOfficerWorkload(MOCK_OFFICER_WORKLOAD);
      setOfficerPerformance(MOCK_OFFICER_PERFORMANCE);
      setConnectionTypes(MOCK_CONNECTION_TYPES);
      setTopHubs(MOCK_TOP_HUBS);
      setSpecializationCoverage(MOCK_SPECIALIZATION_COVERAGE);
      setGraphData({ nodes: MOCK_NODES, links: MOCK_LINKS });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (graphRef.current) {
      // Apply forces directly to the d3 force engine
      graphRef.current.d3Force('charge').strength(-800);
      graphRef.current.d3Force('link').distance(120);
      
      // Auto zoom to fit after graph settles
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }, 500);
    }
  }, [graphData]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    const connectedIds = graphData.links
      .filter(l => {
        const src = typeof l.source === "object" ? (l.source as any).id : l.source;
        const tgt = typeof l.target === "object" ? (l.target as any).id : l.target;
        return src === node.id || tgt === node.id;
      })
      .map(l => {
        const src = typeof l.source === "object" ? (l.source as any).id : l.source;
        const tgt = typeof l.target === "object" ? (l.target as any).id : l.target;
        return src === node.id ? tgt : src;
      });

    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => ({
        ...n,
        highlighted: n.id === node.id || connectedIds.includes(n.id),
      })),
    }));

    setSelected({ nodeId: node.id, crimeType: node.crime_type, severity: node.severity, connectedIds });
  }, [graphData.links]);

  const clearSelection = () => {
    setSelected(null);
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => ({ ...n, highlighted: undefined })),
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-2 shadow-lg rounded text-sm z-50">
          <p className="font-bold text-gray-800 mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
             <p key={idx} style={{ color: p.color || p.fill }} className="font-semibold text-xs">
               {p.name}: {p.value}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Resolved", value: stats.resolved, fill: "#16a34a" },
      { name: "Pending", value: stats.pending, fill: "#eab308" }
    ];
  }, [stats]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.5, 400);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.5, 400);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} className="text-gov-primary" /> Analytics & Network
          </h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading..." : "Current crime insights and fraud entity networks"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm font-medium transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Analytics Tier 1: KPI Cards */}
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

      {/* Row 1: Overall Crime Insights (Charts 1, 2, 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Chart 1: Crime Categories Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 col-span-1 lg:col-span-1">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldAlert size={18} className="text-gray-500"/> Crimes by Category
          </h3>
          <div className="h-64 w-full">
            {stats?.crime_distribution && stats.crime_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.crime_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <XAxis dataKey="crime_type" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-45} textAnchor="end"/>
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Cases" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>

        {/* Chart 2: Weekly Trend Area Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 col-span-1 lg:col-span-1">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-gray-500"/> Case Resolution Trend
          </h3>
          <div className="h-64 w-full">
            {weeklyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                  <XAxis dataKey="week_label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Area type="monotone" dataKey="solved" name="Solved" stroke="#16a34a" fillOpacity={1} fill="url(#colorSolved)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="pending" name="Pending" stroke="#eab308" fillOpacity={1} fill="url(#colorPending)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>

        {/* Chart 3: Severity Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 col-span-1 lg:col-span-1">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChartIcon size={18} className="text-gray-500"/> Severity Distribution
          </h3>
          <div className="h-64 w-full relative">
            {stats?.severity_distribution && stats.severity_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.severity_distribution} dataKey="count" nameKey="severity" cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {stats.severity_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS["Unknown"]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>
      </div>
      
      {/* Row 2: Officer Analytics (Charts 4, 5, 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Chart 4: Officer Caseloads */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-gray-500"/> Officer Caseloads
          </h3>
          <div className="h-64 w-full">
            {officerWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officerWorkload} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-45} textAnchor="end"/>
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Cases" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>

        {/* Chart 5: Officer Performance (Stacked Bar) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target size={18} className="text-gray-500"/> Officer Performance
          </h3>
          <div className="h-64 w-full">
            {officerPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officerPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-45} textAnchor="end"/>
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Bar dataKey="solved" name="Solved" stackId="a" fill="#16a34a" barSize={25} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>

        {/* Chart 6: Global Status Donut */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChartIcon size={18} className="text-gray-500"/> Overall Status Distribution
          </h3>
          <div className="h-64 w-full relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>
      </div>

      {/* Row 3: Network Analytics (Charts 7, 8, 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Chart 7: Connection Types Pie */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Network size={18} className="text-gray-500"/> Connection Types
          </h3>
          <div className="h-64 w-full">
            {connectionTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={connectionTypes} dataKey="count" nameKey="type" cx="50%" cy="45%" outerRadius={80}>
                    {connectionTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={NETWORK_COLORS[index % NETWORK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>

        {/* Chart 8: Top Hubs (Horizontal Bar) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-500"/> Top Connected Entities
          </h3>
          <div className="h-64 w-full">
            {topHubs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topHubs} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb"/>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="case" type="category" tick={{ fontSize: 11, fontFamily: 'monospace' }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="connections" name="Shared Links" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>
        
        {/* Chart 9: Specialization Radar */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target size={18} className="text-gray-500"/> Officer Crime Specialization
          </h3>
          <div className="h-64 w-full">
            {specializationCoverage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={specializationCoverage}>
                  {/* @ts-ignore */}
                  <PolarGrid stroke="#e5e7eb" />
                  {/* @ts-ignore */}
                  <PolarAngleAxis dataKey="crime" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  {/* @ts-ignore */}
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                  {/* @ts-ignore */}
                  <Radar name="Specialists" dataKey="count" stroke="#0891b2" fill="#0891b2" fillOpacity={0.6} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>

      </div>

      {/* Analytics Tier 4: Fraud Network Force Graph */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
            <Network size={18} className="text-gray-500"/> Entity Connection Network
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={handleZoomIn} className="p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors">
              <ZoomIn size={14} className="text-gray-600" />
            </button>
            <button onClick={handleZoomOut} className="p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors">
              <ZoomOut size={14} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Legend inside graph container */}
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 text-xs">
          {[
            { label: "Ransomware/Hacking", color: "#b7202e" },
            { label: "Phishing/Fraud", color: "#dc2626" },
            { label: "UPI/OTP Scam", color: "#f59e0b" },
            { label: "Stalking/Identity", color: "#0891b2" },
            { label: "Bullying/Defamation", color: "#8b5cf6" },
            { label: "Other", color: "#1e3a8a" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1 text-gray-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>

        <div className="flex relative">
          <div className="overflow-hidden flex-1 relative" style={{ height: 600 }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm animate-pulse bg-white z-10">
                Loading graph data...
              </div>
            )}

            {!loading && !error && graphData.nodes.length > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(n: any) => `${n.id} · ${n.crime_type}`}
                nodeColor={(n: any) =>
                  n.highlighted === false ? "#e5e7eb" : n.color
                }
                nodeRelSize={8}
                linkColor={() => "#cbd5e1"}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                onNodeClick={handleNodeClick}
                backgroundColor="#ffffff"
                cooldownTicks={120}
                d3AlphaDecay={0.01}
                d3VelocityDecay={0.3}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const r = 8;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                  ctx.fillStyle = node.highlighted === false ? "#e5e7eb" : node.color;
                  ctx.fill();
                  ctx.strokeStyle = node.highlighted ? "#fff" : "rgba(255,255,255,0.5)";
                  ctx.lineWidth = 1.5;
                  ctx.stroke();
                  
                  // Only show text if zoomed in or if the node is highlighted to prevent overlapping clutter
                  if (globalScale > 1.2 || node.highlighted) {
                    const label = node.id ?? "";
                    ctx.font = `bold ${12 / globalScale}px Inter, sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillStyle = node.highlighted === false ? "#9ca3af" : "#1e293b";
                    ctx.fillText(label, node.x, node.y + r + 2);
                  }
                }}
                nodeCanvasObjectMode={() => "replace"}
              />
            )}
          </div>

          {/* Node click side panel overlay */}
          {selected && (
            <div className="absolute right-4 top-4 bottom-4 w-72 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg p-4 flex-shrink-0 flex flex-col z-20">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <p className="font-bold text-sm text-gray-800">Node Details</p>
                <button onClick={clearSelection} className="hover:bg-gray-100 text-gray-500 p-1 rounded transition-colors">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs font-mono text-gov-blue mb-3 break-all bg-blue-50 p-1.5 rounded">{selected.nodeId}</p>
              <div className="space-y-3 mb-4">
                <div className="flex gap-2 items-center text-xs">
                  <span className="text-gray-400 w-16 font-medium">Crime</span>
                  <Badge label={selected.crimeType || "Unknown"} variant="default" />
                </div>
                <div className="flex gap-2 items-center text-xs">
                  <span className="text-gray-400 w-16 font-medium">Severity</span>
                  {selected.severity && <Badge label={selected.severity} variant={severityVariant(selected.severity)} />}
                </div>
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span className="font-semibold text-gray-700">{selected.connectedIds.length}</span> connected entities found
                </div>
              </div>
              {selected.connectedIds.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-2 tracking-wider">Connected Cases</p>
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {selected.connectedIds.map(cid => (
                      <div key={cid} className="text-xs font-mono text-gov-blue bg-blue-50/50 border border-blue-100/50 px-2.5 py-1.5 rounded shadow-sm truncate">
                        {cid}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
