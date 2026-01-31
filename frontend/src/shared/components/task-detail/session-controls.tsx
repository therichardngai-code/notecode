/**
 * Session Controls component - shown on failed/completed sessions
 * Provides retry/renew/fork actions for session recovery
 */

import { memo } from 'react';
import { RotateCcw, RefreshCw, Copy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Session, SessionResumeMode } from '@/adapters/api/sessions-api';

export interface SessionControlsProps {
  session: Session;
  onStartSession: (mode: SessionResumeMode) => void;
  isLoading: boolean;
}

export const SessionControls = memo(function SessionControls({
  session,
  onStartSession,
  isLoading,
}: SessionControlsProps) {
  const showControls = session.status === 'failed' || session.status === 'completed' || session.status === 'cancelled';
  if (!showControls) return null;

  const statusLabel = session.status === 'failed' ? 'Session Failed' : session.status === 'completed' ? 'Session Completed' : 'Session Cancelled';
  const statusColor = session.status === 'failed' ? 'text-red-500' : session.status === 'completed' ? 'text-green-500' : 'text-muted-foreground';

  return (
    <div className="border rounded-lg p-3 mb-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("text-sm font-medium", statusColor)}>{statusLabel}</span>
        {(session.attemptNumber ?? 1) > 1 && (
          <span className="text-xs text-muted-foreground">Attempt #{session.attemptNumber}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStartSession('retry')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          title="Resume session with context"
        >
          <RotateCcw className="w-3.5 h-3.5" />Retry
        </button>
        <button
          onClick={() => onStartSession('renew')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          title="Fresh start, no history"
        >
          <RefreshCw className="w-3.5 h-3.5" />Renew
        </button>
        <button
          onClick={() => onStartSession('fork')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          title="New session with conversation context"
        >
          <Copy className="w-3.5 h-3.5" />Fork
        </button>
      </div>
    </div>
  );
});
