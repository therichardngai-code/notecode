// Analytics API client for dashboard data
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface OverviewStats {
  totalTokens: number;
  totalSessions: number;
  avgResponseTimeMs: number;
  totalCostUsd: number;
}

export interface DailyUsage {
  day: string;
  dayName: string;
  tokens: number;
  sessions: number;
  cost: number;
}

export interface ModelUsage {
  model: string;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface RecentActivity {
  id: string;
  startedAt: string;
  tokenTotal: number;
  provider: string;
  status: string;
  taskTitle: string;
  durationMs: number;
  costUsd: number;
}

export const analyticsApi = {
  getOverview: async (projectId?: string): Promise<OverviewStats> => {
    const url = projectId
      ? `${API_BASE}/api/analytics/overview?projectId=${projectId}`
      : `${API_BASE}/api/analytics/overview`;
    const res = await fetch(url);
    return res.json();
  },

  getDailyUsage: async (projectId?: string): Promise<DailyUsage[]> => {
    const url = projectId
      ? `${API_BASE}/api/analytics/daily-usage?projectId=${projectId}`
      : `${API_BASE}/api/analytics/daily-usage`;
    const res = await fetch(url);
    return res.json();
  },

  getModelDistribution: async (projectId?: string): Promise<ModelUsage[]> => {
    const url = projectId
      ? `${API_BASE}/api/analytics/model-distribution?projectId=${projectId}`
      : `${API_BASE}/api/analytics/model-distribution`;
    const res = await fetch(url);
    return res.json();
  },

  getRecentActivity: async (projectId?: string, limit = 10): Promise<RecentActivity[]> => {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    params.set('limit', String(limit));
    const res = await fetch(`${API_BASE}/api/analytics/recent-activity?${params}`);
    return res.json();
  },
};
