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

export const api = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  getRecentComplaints: async (limit = 10): Promise<RecentComplaint[]> => {
    const res = await fetch(`${BASE_URL}/api/dashboard/recent?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch recent complaints");
    return res.json();
  },

  getFraudNetwork: async (): Promise<FraudNetworkData> => {
    const res = await fetch(`${BASE_URL}/api/dashboard/fraud-network`);
    if (!res.ok) throw new Error("Failed to fetch fraud network");
    return res.json();
  },

  getComplaintInsights: async (id: string) => {
    const res = await fetch(`${BASE_URL}/api/complaint/${id}/insights`);
    if (!res.ok) throw new Error("Failed to fetch insights");
    return res.json();
  },
};
