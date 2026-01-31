/**
 * Task Stats Bar component - shows task-level attempt statistics
 * Displays total attempts with breakdown by type (renew, retry, fork)
 */

import { memo } from 'react';

export interface TaskStatsBarProps {
  totalAttempts: number;
  sessionsCount: number;
  renewCount?: number;
  retryCount?: number;
  forkCount?: number;
}

export const TaskStatsBar = memo(function TaskStatsBar({
  totalAttempts,
  sessionsCount,
  renewCount = 0,
  retryCount = 0,
  forkCount = 0,
}: TaskStatsBarProps) {
  if (sessionsCount === 0) return null;

  return (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/20 text-xs">
      <span className="text-muted-foreground">Stats:</span>
      <span className="text-foreground font-medium">{totalAttempts || sessionsCount} attempts</span>
      {renewCount > 0 && <span className="text-blue-500">{renewCount} renew</span>}
      {retryCount > 0 && <span className="text-yellow-500">{retryCount} retry</span>}
      {forkCount > 0 && <span className="text-purple-500">{forkCount} fork</span>}
    </div>
  );
});
