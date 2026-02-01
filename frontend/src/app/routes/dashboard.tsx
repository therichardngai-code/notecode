import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { BarChart3, Zap, MessageSquare, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useProjects } from '@/shared/hooks/use-projects-query';
import {
  useAnalyticsOverview,
  useAnalyticsDailyUsage,
  useAnalyticsModelDistribution,
  useAnalyticsRecentActivity,
} from '@/features/analytics/use-analytics';
import type { DailyUsage, ModelUsage, RecentActivity } from '@/features/analytics/analytics-api';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, loading }: StatCardProps) {
  return (
    <div className="rounded-xl glass p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="text-base text-muted-foreground">{title}</span>
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground/60" />
        </div>
      </div>
      <div className="text-4xl font-semibold text-foreground mb-3">
        {loading ? '...' : value}
      </div>
      {subtitle && (
        <div className="text-base text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

function TokenUsageChart({ data, loading }: { data: DailyUsage[]; loading?: boolean }) {
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.tokens)) : 1;

  return (
    <div className="rounded-xl glass p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-base font-medium text-foreground">Token Usage (Last 7 Days)</h3>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <div className="flex items-end justify-between gap-4 h-48 pt-4">
          {data.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-3">
              <div className="w-full flex items-end justify-center gap-1 h-40">
                <div
                  className="w-8 bg-foreground/60 rounded-t transition-all"
                  style={{ height: `${(d.tokens / maxValue) * 100}%` }}
                  title={`${d.tokens.toLocaleString()} tokens`}
                />
              </div>
              <span className="text-sm text-muted-foreground">{d.dayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelUsageChart({ data, loading }: { data: ModelUsage[]; loading?: boolean }) {
  const totalTokens = data.reduce((sum, d) => sum + d.totalTokens, 0) || 1;

  return (
    <div className="rounded-xl glass p-6">
      <h3 className="text-base font-medium text-foreground mb-8">Model Usage Distribution</h3>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <div className="space-y-5">
          {data.map((d, i) => {
            const percentage = Math.round((d.totalTokens / totalTokens) * 100);
            const colors = ['bg-foreground/70', 'bg-foreground/50', 'bg-foreground/35', 'bg-foreground/20'];
            return (
              <div key={d.model}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-base text-foreground">{d.model}</span>
                  <span className="text-base text-muted-foreground">{percentage}%</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", colors[i % colors.length])}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentActivityList({ data, loading }: { data: RecentActivity[]; loading?: boolean }) {
  return (
    <div className="rounded-xl glass p-6">
      <h3 className="text-base font-medium text-foreground mb-6">Recent Activity</h3>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No recent activity</div>
      ) : (
        <div className="space-y-1">
          {data.map((activity, idx) => (
            <div key={activity.id || idx} className="flex items-center justify-between py-4 border-b border-sidebar-border last:border-0">
              <div>
                <div className="text-base text-foreground mb-1">{activity.taskTitle || 'Chat session'}</div>
                <div className="text-sm text-muted-foreground">
                  {activity.provider} · {activity.tokenTotal.toLocaleString()} tokens
                </div>
              </div>
              <span className="text-base text-muted-foreground">{formatTimeAgo(activity.startedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  return `${(secs / 60).toFixed(1)}m`;
}

function DashboardPage() {
  const [selectedProject, setSelectedProject] = useState<string | undefined>();

  const { data: projects } = useProjects();
  const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview(selectedProject);
  const { data: dailyUsage, isLoading: loadingDaily } = useAnalyticsDailyUsage(selectedProject);
  const { data: modelDist, isLoading: loadingModel } = useAnalyticsModelDistribution(selectedProject);
  const { data: recentActivity, isLoading: loadingRecent } = useAnalyticsRecentActivity(selectedProject);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Token usage and analytics</p>
          </div>
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(e.target.value || undefined)}
          className="border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
        >
          <option value="">All Projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Tokens Used"
            value={formatNumber(overview?.totalTokens ?? 0)}
            icon={Zap}
            loading={loadingOverview}
          />
          <StatCard
            title="Chat Sessions"
            value={String(overview?.totalSessions ?? 0)}
            icon={MessageSquare}
            loading={loadingOverview}
          />
          <StatCard
            title="Avg. Response Time"
            value={formatDuration(overview?.avgResponseTimeMs ?? 0)}
            icon={Clock}
            loading={loadingOverview}
          />
          <StatCard
            title="Estimated Cost"
            value={`$${(overview?.totalCostUsd ?? 0).toFixed(2)}`}
            icon={DollarSign}
            loading={loadingOverview}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <TokenUsageChart data={dailyUsage ?? []} loading={loadingDaily} />
          <ModelUsageChart data={modelDist ?? []} loading={loadingModel} />
        </div>

        {/* Recent Activity */}
        <RecentActivityList data={recentActivity ?? []} loading={loadingRecent} />
      </div>
    </div>
  );
}
