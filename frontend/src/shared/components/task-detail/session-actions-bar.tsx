/**
 * Session Actions Bar component - shows session status with retry/renew/fork buttons
 * Used when a session is in terminal state (failed, completed, cancelled, paused)
 */

import { RotateCcw, RefreshCw, Copy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Session, SessionResumeMode } from '@/adapters/api/sessions-api';

export interface SessionActionsBarProps {
  session: Session;
  onStartSession: (mode: SessionResumeMode) => void;
  isLoading: boolean;
}

const statusStyles: Record<string, string> = {
  failed: 'bg-red-500/20 text-red-500',
  completed: 'bg-green-500/20 text-green-600',
  cancelled: 'bg-gray-500/20 text-gray-500',
  paused: 'bg-yellow-500/20 text-yellow-600',
};

export function SessionActionsBar({ session, onStartSession, isLoading }: SessionActionsBarProps) {
  const showActions = ['failed', 'completed', 'cancelled', 'paused'].includes(session.status);
  if (!showActions) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusStyles[session.status])}>
        {session.status}
      </span>
      <span className="text-xs text-muted-foreground flex-1">
        {session.status === 'paused' ? 'Session paused' : 'Session ended'}
      </span>
      <button
        onClick={() => onStartSession('retry')}
        disabled={isLoading}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
        title="Resume with context"
      >
        <RotateCcw className="w-3.5 h-3.5" />Retry
      </button>
      <button
        onClick={() => onStartSession('renew')}
        disabled={isLoading}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
        title="Fresh start"
      >
        <RefreshCw className="w-3.5 h-3.5" />Renew
      </button>
      <button
        onClick={() => onStartSession('fork')}
        disabled={isLoading}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        title="New with conversation"
      >
        <Copy className="w-3.5 h-3.5" />Fork
      </button>
    </div>
  );
}
