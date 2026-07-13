// frontend/src/services/api.ts
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export interface DashboardStats {
  total_complaints: number;
  high_severity: number;
  resolved: number;
  pending: number;
  crime_distribution: { crime_type: string; count: number }[];
  severity_distribution: { severity: string; count: number }[];
}

export interface RecentComplaint {
  complaint_id: string;
  citizen_name: string;
  crime_type: string;
  severity: string;
  status: string;
  summary: string;
  created_at: string;
}

export interface FraudNetworkData {
  nodes: { id: string; crime_type: string; severity: string }[];
  edges: { source: string; target: string; entity_type: string }[];
  node_count: number;
  edge_count: number;
}

export interface ComplaintFilters {
  query?: string;
  crime_type?: string;
  severity?: string;
}

export interface PendingItem {
  complaint_id: string;
  citizen_name: string;
  crime_type: string;
  severity: string;
  reason: string;
}

export interface WeeklyBreakdown {
  week_label: string;
  solved: number;
  processed: number;
  pending: number;
  total: number;
  pending_items: PendingItem[];
}

export interface OfficerReportEntry {
  officer_name: string;
  crime_specialization: string[];
  total_solved: number;
  total_processed: number;
  total_pending: number;
  total_complaints: number;
  weekly_breakdown: WeeklyBreakdown[];
  all_pending_items: PendingItem[];
}

export interface OfficerReport {
  weeks: number;
  week_labels: string[];
  officers: OfficerReportEntry[];
  generated_at: string;
}

export const api = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  getRecentComplaints: async (filters?: ComplaintFilters, limit = 50): Promise<RecentComplaint[]> => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    if (filters?.query) params.append("query", filters.query);
    if (filters?.crime_type && filters.crime_type !== "All") params.append("crime_type", filters.crime_type);
    if (filters?.severity && filters.severity !== "All") params.append("severity", filters.severity);
    
    const res = await fetch(`${BASE_URL}/api/dashboard/recent?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch recent complaints");
    return res.json();
  },

  getFraudNetwork: async (): Promise<FraudNetworkData> => {
    const res = await fetch(`${BASE_URL}/api/dashboard/fraud-network`);
    if (!res.ok) throw new Error("Failed to fetch fraud network");
    return res.json();
  },

  simulatePipeline: async (text: string) => {
    const res = await fetch(`${BASE_URL}/api/demo/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Simulation failed");
    return res.json();
  },

  getAnomalies: async (): Promise<RecentComplaint[]> => {
    const res = await fetch(`${BASE_URL}/api/alerts/anomalies`);
    if (!res.ok) throw new Error("Failed to fetch anomalies");
    return res.json();
  },

  getAnomaliesCount: async (): Promise<number> => {
    const res = await fetch(`${BASE_URL}/api/alerts/count`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count;
  },

  getComplaintInsights: async (id: string) => {
    const res = await fetch(`${BASE_URL}/api/complaint/${id}/insights`);
    if (!res.ok) throw new Error("Failed to fetch insights");
    return res.json();
  },

  streamComplaintInsights: async (
    id: string, 
    onChunk: (chunk: any) => void,
    onError: (err: string) => void
  ) => {
    try {
      const res = await fetch(`${BASE_URL}/api/complaint/${id}/insights/stream`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");
      
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunkString = decoder.decode(value, { stream: true });
          const parts = chunkString.split("\n");
          
          for (let part of parts) {
            if (!part.trim()) continue;
            try {
              const parsed = JSON.parse(part);
              onChunk(parsed);
            } catch (e) {
              console.warn("Failed to parse stream chunk:", part, e);
            }
          }
        }
      }
    } catch (err: any) {
      onError(err.message || "Stream failed");
    }
  },

  getOfficerReport: async (weeks = 4): Promise<OfficerReport> => {
    const res = await fetch(`${BASE_URL}/api/dashboard/officer-report?weeks=${weeks}`);
    if (!res.ok) throw new Error("Failed to fetch officer report");
    return res.json();
  },

  getReplyDraft: async (id: string): Promise<{ draft: string }> => {
    const res = await fetch(`${BASE_URL}/api/complaint/${id}/reply/draft`);
    if (!res.ok) throw new Error("Failed to fetch reply draft");
    return res.json();
  },

  sendReply: async (id: string, text: string): Promise<{ status: string, message: string }> => {
    const res = await fetch(`${BASE_URL}/api/complaint/${id}/reply/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply_text: text }),
    });
    if (!res.ok) throw new Error("Failed to send reply");
    return res.json();
  },
};

