import { Activity, Clock, FileText, DollarSign, Zap } from 'lucide-react';
import type { Session } from '../../../domain/entities';

interface SessionStatsProps {
  session: Session;
}

function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatDuration(durationMs?: number): string {
  if (!durationMs) return '0m';
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(4)}`;
}

export function SessionStats({ session }: SessionStatsProps) {
  const { tokenUsage, durationMs, toolStats } = session;
  const totalCalls = toolStats.totalCalls;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Total Tokens */}
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-medium">Total Tokens</span>
        </div>
        <div className="text-2xl font-bold">
          {formatTokenCount(tokenUsage.total)}
        </div>
        <div className="text-xs text-muted-foreground">
          In: {formatTokenCount(tokenUsage.input)} | Out:{' '}
          {formatTokenCount(tokenUsage.output)}
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-medium">Duration</span>
        </div>
        <div className="text-2xl font-bold">{formatDuration(durationMs)}</div>
        <div className="text-xs text-muted-foreground">
          API: {formatDuration(session.durationApiMs)}
        </div>
      </div>

      {/* Tool Calls */}
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-medium">Tool Calls</span>
        </div>
        <div className="text-2xl font-bold">{totalCalls}</div>
        <div className="text-xs text-muted-foreground">
          Success: {toolStats.totalSuccess}
        </div>
      </div>

      {/* Cache Stats */}
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span className="text-xs font-medium">Cache</span>
        </div>
        <div className="text-2xl font-bold">
          {formatTokenCount(tokenUsage.cacheRead)}
        </div>
        <div className="text-xs text-muted-foreground">
          Created: {formatTokenCount(tokenUsage.cacheCreation)}
        </div>
      </div>

      {/* Cost */}
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          <span className="text-xs font-medium">Cost</span>
        </div>
        <div className="text-2xl font-bold">
          {formatCost(tokenUsage.estimatedCostUsd)}
        </div>
        <div className="text-xs text-muted-foreground">Estimated</div>
      </div>
    </div>
  );
}
