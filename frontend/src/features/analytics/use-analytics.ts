// React Query hooks for analytics data with 5-minute cache
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics-api';

export function useAnalyticsOverview(projectId?: string) {
  return useQuery({
    queryKey: ['analytics', 'overview', projectId],
    queryFn: () => analyticsApi.getOverview(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes (match backend cache)
  });
}

export function useAnalyticsDailyUsage(projectId?: string) {
  return useQuery({
    queryKey: ['analytics', 'daily-usage', projectId],
    queryFn: () => analyticsApi.getDailyUsage(projectId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsModelDistribution(projectId?: string) {
  return useQuery({
    queryKey: ['analytics', 'model-distribution', projectId],
    queryFn: () => analyticsApi.getModelDistribution(projectId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsRecentActivity(projectId?: string, limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'recent-activity', projectId, limit],
    queryFn: () => analyticsApi.getRecentActivity(projectId, limit),
    staleTime: 5 * 60 * 1000,
  });
}
