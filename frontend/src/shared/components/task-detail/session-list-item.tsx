/**
 * Session List Item component - displays a single session in the sessions list
 * Shows status icon, session ID, attempt number, resume mode, and timestamps
 */

import { Clock, Pause, CheckCircle, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Session } from '@/adapters/api/sessions-api';

export interface SessionListItemProps {
  session: Session;
  index: number;
  isLatest: boolean;
}

const statusBorderStyles: Record<string, string> = {
  queued: 'border-gray-500/30 bg-gray-500/5',
  running: 'border-blue-500/50 bg-blue-500/5',
  paused: 'border-yellow-500/30 bg-yellow-500/5',
  completed: 'border-green-500/30 bg-green-500/5',
  failed: 'border-red-500/30 bg-red-500/5',
  cancelled: 'border-gray-500/30 bg-gray-500/5',
};

const statusBadgeStyles: Record<string, string> = {
  queued: 'bg-gray-500/20 text-gray-500',
  running: 'bg-blue-500/20 text-blue-500',
  paused: 'bg-yellow-500/20 text-yellow-600',
  completed: 'bg-green-500/20 text-green-600',
  failed: 'bg-red-500/20 text-red-500',
  cancelled: 'bg-gray-500/20 text-gray-500',
};

const resumeModeStyles: Record<string, string> = {
  retry: 'bg-yellow-500/20 text-yellow-600',
  renew: 'bg-blue-500/20 text-blue-600',
  fork: 'bg-purple-500/20 text-purple-600',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'queued':
      return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    case 'running':
      return (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      );
    case 'paused':
      return <Pause className="w-3.5 h-3.5 text-yellow-500" />;
    case 'completed':
      return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    case 'failed':
      return <X className="w-3.5 h-3.5 text-red-500" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-gray-500" />;
  }
}

export function SessionListItem({ session, index, isLatest }: SessionListItemProps) {
  const createdAt = new Date(session.createdAt);
  const endedAt = session.endedAt ? new Date(session.endedAt) : null;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        isLatest ? statusBorderStyles[session.status] || 'border-border' : 'border-border bg-muted/20'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon status={session.status} />
        <span className="text-xs font-mono text-muted-foreground">
          {session.id.slice(0, 8)}...
        </span>
        <span className="text-xs text-foreground font-medium">
          #{session.attemptNumber ?? index + 1}
        </span>
        {session.resumeMode && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', resumeModeStyles[session.resumeMode])}>
            {session.resumeMode}
          </span>
        )}
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto', statusBadgeStyles[session.status])}>
          {session.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Started: {createdAt.toLocaleTimeString()}</span>
        {endedAt && <span>Ended: {endedAt.toLocaleTimeString()}</span>}
        {session.provider && <span className="text-foreground/70">{session.provider}</span>}
      </div>
    </div>
  );
}
