import { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Network, ZoomIn, ZoomOut, RefreshCw, X } from "lucide-react";
import Badge, { severityVariant } from "../components/ui/Badge";
import { api, FraudNetworkData } from "../services/api";

// Crime type → node color mapping (Day 86)
const crimeColor = (crimeType: string): string => {
  const t = (crimeType ?? "").toLowerCase();
  if (t.includes("ransomware") || t.includes("hacking")) return "#b7202e";
  if (t.includes("phishing") || t.includes("fraud")) return "#dc2626";
  if (t.includes("upi") || t.includes("otp")) return "#f59e0b";
  if (t.includes("stalking") || t.includes("identity")) return "#0891b2";
  if (t.includes("bullying") || t.includes("defamation")) return "#8b5cf6";
  return "#1e3a8a";
};

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

// ── Mock data shown when Neo4j is offline / empty ──────────────────────────
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
  { id: "C-011", crime_type: "Ransomware/Hacking",severity: "High"     },
  { id: "C-012", crime_type: "Financial Fraud",   severity: "High"     },
  { id: "C-013", crime_type: "Financial Fraud",   severity: "Medium"   },
  { id: "C-014", crime_type: "Cyberbullying",     severity: "Low"      },
  { id: "C-015", crime_type: "UPI/OTP Scam",      severity: "High"     },
  { id: "C-016", crime_type: "Phishing/Fraud",    severity: "Critical" },
  { id: "C-017", crime_type: "Identity Theft",    severity: "Medium"   },
  { id: "C-018", crime_type: "Ransomware/Hacking",severity: "High"     },
  { id: "C-019", crime_type: "Financial Fraud",   severity: "Critical" },
  { id: "C-020", crime_type: "UPI/OTP Scam",      severity: "Low"      },
].map(n => ({ ...n, color: crimeColor(n.crime_type) }));

const MOCK_LINKS: GraphLink[] = [
  { source: "C-001", target: "C-004", entity_type: "shared_ip" },
  { source: "C-001", target: "C-009", entity_type: "shared_ip" },
  { source: "C-002", target: "C-006", entity_type: "shared_wallet" },
  { source: "C-002", target: "C-011", entity_type: "shared_wallet" },
  { source: "C-003", target: "C-008", entity_type: "shared_phone" },
  { source: "C-003", target: "C-015", entity_type: "shared_phone" },
  { source: "C-004", target: "C-016", entity_type: "shared_ip" },
  { source: "C-005", target: "C-010", entity_type: "shared_email" },
  { source: "C-005", target: "C-017", entity_type: "shared_email" },
  { source: "C-006", target: "C-018", entity_type: "shared_wallet" },
  { source: "C-012", target: "C-013", entity_type: "shared_account" },
  { source: "C-012", target: "C-019", entity_type: "shared_account" },
  { source: "C-007", target: "C-014", entity_type: "shared_device" },
  { source: "C-008", target: "C-020", entity_type: "shared_phone" },
  { source: "C-009", target: "C-016", entity_type: "shared_ip" },
  { source: "C-010", target: "C-005", entity_type: "shared_email" },
  { source: "C-011", target: "C-002", entity_type: "shared_wallet" },
  { source: "C-015", target: "C-020", entity_type: "shared_phone" },
];

export default function FraudNetwork() {
  const graphRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SidePanel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFraudNetwork();
      if (data.nodes.length === 0) {
        // Neo4j empty — show demo data
        setGraphData({ nodes: MOCK_NODES, links: MOCK_LINKS });
      } else {
        setGraphData({
          nodes: data.nodes.map(n => ({ ...n, color: crimeColor(n.crime_type) })),
          links: data.edges.map(e => ({ source: e.source, target: e.target, entity_type: e.entity_type })),
        });
      }
    } catch (e: any) {
      // Backend offline — show demo data anyway
      setError(null);
      setGraphData({ nodes: MOCK_NODES, links: MOCK_LINKS });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Day 86: Node click — highlight connected nodes + open side panel
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

    // Highlight: dim all nodes, brighten connected
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Network size={20} className="text-gov-primary" /> Fraud Network Graph
          </h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading..." : `${graphData.nodes.length} nodes · ${graphData.links.length} shared-entity edges`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => graphRef.current?.zoomIn()} className="p-2 bg-white border rounded hover:bg-gray-50 transition-colors">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => graphRef.current?.zoomOut()} className="p-2 bg-white border rounded hover:bg-gray-50 transition-colors">
            <ZoomOut size={15} />
          </button>
          <button onClick={load} className="p-2 bg-white border rounded hover:bg-gray-50 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "Ransomware/Hacking", color: "#b7202e" },
          { label: "Phishing/Fraud", color: "#dc2626" },
          { label: "UPI/OTP Scam", color: "#f59e0b" },
          { label: "Stalking/Identity", color: "#0891b2" },
          { label: "Bullying/Defamation", color: "#8b5cf6" },
          { label: "Other", color: "#1e3a8a" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-gray-600">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Graph canvas */}
      <div className="flex gap-4">
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex-1 relative" style={{ height: 520 }}>
          {loading && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm animate-pulse">
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
              nodeRelSize={6}
              linkColor={() => "#94a3b8"}
              linkWidth={1.5}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              onNodeClick={handleNodeClick}
              backgroundColor="#F8FAFC"
              cooldownTicks={120}
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.3}
              d3Force={(engine: any) => {
                engine.force("charge").strength(-300);
                engine.force("link").distance(60).strength(1);
                engine.force("center")?.strength(0.5);
              }}
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const r = 6;
                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = node.highlighted === false ? "#e5e7eb" : node.color;
                ctx.fill();
                ctx.strokeStyle = node.highlighted ? "#fff" : "rgba(255,255,255,0.5)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Draw label always visible
                const label = node.id ?? "";
                ctx.font = `bold ${11 / globalScale}px Inter, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillStyle = node.highlighted === false ? "#9ca3af" : "#1e293b";
                ctx.fillText(label, node.x, node.y + r + 2);
              }}
              nodeCanvasObjectMode={() => "replace"}
            />
          )}
        </div>

        {/* Day 86: Node click side panel */}
        {selected && (
          <div className="w-72 bg-white border border-gray-200 rounded shadow-sm p-4 flex-shrink-0 border-t-4 border-t-gov-primary">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm text-gray-800">Node Details</p>
              <button onClick={clearSelection} className="hover:bg-gray-100 p-1 rounded">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs font-mono text-gov-blue mb-3 break-all">{selected.nodeId}</p>
            <div className="space-y-2 mb-4">
              <div className="flex gap-2 items-center text-xs">
                <span className="text-gray-400 w-16">Crime</span>
                <Badge label={selected.crimeType || "Unknown"} variant="default" />
              </div>
              <div className="flex gap-2 items-center text-xs">
                <span className="text-gray-400 w-16">Severity</span>
                {selected.severity && <Badge label={selected.severity} variant={severityVariant(selected.severity)} />}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-semibold">{selected.connectedIds.length}</span> connected nodes
              </div>
            </div>
            {selected.connectedIds.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Connected Cases</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selected.connectedIds.map(cid => (
                    <div key={cid} className="text-xs font-mono text-gov-blue bg-blue-50 border border-blue-100 px-2 py-1 rounded truncate">
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
  );
}
