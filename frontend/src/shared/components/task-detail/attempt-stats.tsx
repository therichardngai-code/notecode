/**
 * Attempt Stats component - shows task-level attempt tracking
 * Displays total attempts with breakdown by type (retry, renew, fork)
 */

import { RotateCcw } from 'lucide-react';

export interface AttemptStatsProps {
  totalAttempts: number;
  renewCount: number;
  retryCount: number;
  forkCount: number;
}

export function AttemptStats({
  totalAttempts,
  renewCount,
  retryCount,
  forkCount,
}: AttemptStatsProps) {
  if (totalAttempts === 0) return null;

  const parts: string[] = [];
  if (renewCount > 0) parts.push(`${renewCount} renew`);
  if (retryCount > 0) parts.push(`${retryCount} ${retryCount === 1 ? 'retry' : 'retries'}`);
  if (forkCount > 0) parts.push(`${forkCount} ${forkCount === 1 ? 'fork' : 'forks'}`);

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <RotateCcw className="w-3 h-3" />
      {totalAttempts} {totalAttempts === 1 ? 'attempt' : 'attempts'}
      {parts.length > 0 && <span className="text-muted-foreground/70">({parts.join(', ')})</span>}
    </span>
  );
}
