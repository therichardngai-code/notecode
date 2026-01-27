import { createFileRoute } from '@tanstack/react-router';
import { BarChart3, Zap, MessageSquare, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

// Mock data for charts
const tokenUsageData = [
  { day: 'Mon', input: 12500, output: 8200 },
  { day: 'Tue', input: 18300, output: 11500 },
  { day: 'Wed', input: 15800, output: 9800 },
  { day: 'Thu', input: 22100, output: 14200 },
  { day: 'Fri', input: 19500, output: 12800 },
  { day: 'Sat', input: 8200, output: 5100 },
  { day: 'Sun', input: 6500, output: 4200 },
];

const modelUsageData = [
  { model: 'GPT-4', percentage: 45, color: 'bg-foreground/70' },
  { model: 'Claude 3', percentage: 35, color: 'bg-foreground/50' },
  { model: 'GPT-3.5', percentage: 15, color: 'bg-foreground/35' },
  { model: 'Other', percentage: 5, color: 'bg-foreground/20' },
];

const recentActivities = [
  { id: '1', action: 'Chat session completed', model: 'GPT-4', tokens: '2,450', time: '5 min ago' },
  { id: '2', action: 'Code generation', model: 'Claude 3', tokens: '1,820', time: '12 min ago' },
  { id: '3', action: 'Document analysis', model: 'GPT-4', tokens: '3,200', time: '28 min ago' },
  { id: '4', action: 'Quick question', model: 'GPT-3.5', tokens: '450', time: '1 hour ago' },
  { id: '5', action: 'Code review', model: 'Claude 3', tokens: '2,100', time: '2 hours ago' },
];

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
}

function StatCard({ title, value, change, changeType, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl glass p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="text-base text-muted-foreground">{title}</span>
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground/60" />
        </div>
      </div>
      <div className="text-4xl font-semibold text-foreground mb-3">{value}</div>
      <div className={cn(
        "text-base",
        changeType === 'positive' && "text-foreground/70",
        changeType === 'negative' && "text-foreground/50",
        changeType === 'neutral' && "text-muted-foreground"
      )}>
        {change}
      </div>
    </div>
  );
}

function TokenUsageChart() {
  const maxValue = Math.max(...tokenUsageData.flatMap(d => [d.input, d.output]));

  return (
    <div className="rounded-xl glass p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-base font-medium text-foreground">Token Usage (Last 7 Days)</h3>
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-foreground/60" />
            <span className="text-muted-foreground">Input</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-foreground/30" />
            <span className="text-muted-foreground">Output</span>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-4 h-48 pt-4">
        {tokenUsageData.map((data) => (
          <div key={data.day} className="flex-1 flex flex-col items-center gap-3">
            <div className="w-full flex items-end justify-center gap-1 h-40">
              <div
                className="w-5 bg-foreground/60 rounded-t transition-all"
                style={{ height: `${(data.input / maxValue) * 100}%` }}
              />
              <div
                className="w-5 bg-foreground/30 rounded-t transition-all"
                style={{ height: `${(data.output / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">{data.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelUsageChart() {
  return (
    <div className="rounded-xl glass p-6">
      <h3 className="text-base font-medium text-foreground mb-8">Model Usage Distribution</h3>

      {/* Horizontal Bar Chart */}
      <div className="space-y-5">
        {modelUsageData.map((data) => (
          <div key={data.model}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-base text-foreground">{data.model}</span>
              <span className="text-base text-muted-foreground">{data.percentage}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", data.color)}
                style={{ width: `${data.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityList() {
  return (
    <div className="rounded-xl glass p-6">
      <h3 className="text-base font-medium text-foreground mb-6">Recent Activity</h3>

      <div className="space-y-1">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between py-4 border-b border-sidebar-border last:border-0">
            <div>
              <div className="text-base text-foreground mb-1">{activity.action}</div>
              <div className="text-sm text-muted-foreground">{activity.model} · {activity.tokens} tokens</div>
            </div>
            <span className="text-base text-muted-foreground">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
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
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Tokens Used"
            value="124.5K"
            change="+12.5% from last week"
            changeType="positive"
            icon={Zap}
          />
          <StatCard
            title="Chat Sessions"
            value="48"
            change="+8 from yesterday"
            changeType="positive"
            icon={MessageSquare}
          />
          <StatCard
            title="Avg. Response Time"
            value="1.2s"
            change="-0.3s improvement"
            changeType="positive"
            icon={Clock}
          />
          <StatCard
            title="Estimated Cost"
            value="$12.40"
            change="Within budget"
            changeType="neutral"
            icon={DollarSign}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <TokenUsageChart />
          <ModelUsageChart />
        </div>

        {/* Recent Activity */}
        <RecentActivityList />
      </div>
    </div>
  );
}
