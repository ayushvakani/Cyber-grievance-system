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

export default function FraudNetwork() {
  const graphRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [rawData, setRawData] = useState<FraudNetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SidePanel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFraudNetwork();
      setRawData(data);
      setGraphData({
        nodes: data.nodes.map(n => ({ ...n, color: crimeColor(n.crime_type) })),
        links: data.edges.map(e => ({ source: e.source, target: e.target, entity_type: e.entity_type })),
      });
    } catch (e: any) {
      setError(e.message);
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
            {rawData ? `${rawData.node_count} nodes · ${rawData.edge_count} shared-entity edges` : "Loading..."}
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
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex-1" style={{ height: 520 }}>
          {loading && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm animate-pulse">
              Loading graph data...
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center text-gov-alert text-sm">
              Failed to load: {error}
            </div>
          )}
          {!loading && !error && graphData.nodes.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No fraud network data in Neo4j yet.
            </div>
          )}
          {!loading && !error && graphData.nodes.length > 0 && (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel={(n: any) => `${n.id} · ${n.crime_type}`}
              nodeColor={(n: any) => n.highlighted === false ? "#e5e7eb" : n.color}
              nodeRelSize={5}
              linkColor={() => "#d1d5db"}
              linkWidth={1}
              onNodeClick={handleNodeClick}
              backgroundColor="#F3F4E5"
              nodeCanvasObjectMode={() => "after"}
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                if (globalScale < 2) return;
                const label = node.id?.slice(-6) ?? "";
                ctx.font = `${8 / globalScale}px Inter`;
                ctx.fillStyle = "#374151";
                ctx.textAlign = "center";
                ctx.fillText(label, node.x, node.y + 8);
              }}
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
