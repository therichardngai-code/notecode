import { memo } from 'react';
import { Clock, CheckCircle, X, Pause, RotateCcw, RefreshCw, Copy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Session } from '@/adapters/api/sessions-api';
import type { Task } from '@/adapters/api/tasks-api';

type SessionResumeMode = 'retry' | 'renew' | 'fork';

interface SessionsTabProps {
  task: Task;
  sessions: Session[];
  latestSession: Session | undefined;
  isStartingSession: boolean;
  onStartSessionWithMode: (mode: SessionResumeMode) => void;
}

export const SessionsTab = memo(function SessionsTab({
  task,
  sessions,
  latestSession,
  isStartingSession,
  onStartSessionWithMode,
}: SessionsTabProps) {
  return (
    <div className="space-y-3">
      {/* Section 1: Session Actions - show when session is not running/queued */}
      {latestSession && ['failed', 'completed', 'cancelled', 'paused'].includes(latestSession.status) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              latestSession.status === 'failed' && "bg-red-500/20 text-red-500",
              latestSession.status === 'completed' && "bg-green-500/20 text-green-600",
              latestSession.status === 'cancelled' && "bg-gray-500/20 text-gray-500",
              latestSession.status === 'paused' && "bg-yellow-500/20 text-yellow-600"
            )}
          >
            {latestSession.status}
          </span>
          <span className="text-xs text-muted-foreground flex-1">
            {latestSession.status === 'paused' ? 'Session paused' : 'Session ended'}
          </span>
          <button
            onClick={() => onStartSessionWithMode('retry')}
            disabled={isStartingSession}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
            title="Resume with context"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
          <button
            onClick={() => onStartSessionWithMode('renew')}
            disabled={isStartingSession}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
            title="Fresh start"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Renew
          </button>
          <button
            onClick={() => onStartSessionWithMode('fork')}
            disabled={isStartingSession}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            title="New with conversation"
          >
            <Copy className="w-3.5 h-3.5" />
            Fork
          </button>
        </div>
      )}

      {/* Section 2: Task-level Stats - always show when there are sessions */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/20 text-xs">
          <span className="text-muted-foreground">Stats:</span>
          <span className="text-foreground font-medium">
            {task.totalAttempts ?? sessions.length} attempts
          </span>
          {(task.renewCount ?? 0) > 0 && (
            <span className="text-blue-500">{task.renewCount} renew</span>
          )}
          {(task.retryCount ?? 0) > 0 && (
            <span className="text-yellow-500">{task.retryCount} retry</span>
          )}
          {(task.forkCount ?? 0) > 0 && (
            <span className="text-purple-500">{task.forkCount} fork</span>
          )}
        </div>
      )}

      {/* Section 3: Sessions List */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No sessions yet</p>
          <p className="text-xs mt-1">Start the task to begin a session</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground px-1">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} • Latest first
          </div>
          {[...sessions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((session, idx) => (
              <div
                key={session.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  idx === 0 && session.status === 'queued' && "border-gray-500/30 bg-gray-500/5",
                  idx === 0 && session.status === 'running' && "border-blue-500/50 bg-blue-500/5",
                  idx === 0 && session.status === 'paused' && "border-yellow-500/30 bg-yellow-500/5",
                  idx === 0 && session.status === 'completed' && "border-green-500/30 bg-green-500/5",
                  idx === 0 && session.status === 'failed' && "border-red-500/30 bg-red-500/5",
                  idx === 0 && session.status === 'cancelled' && "border-gray-500/30 bg-gray-500/5",
                  idx !== 0 && "border-border bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {/* Status Icon */}
                  {session.status === 'queued' ? (
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                  ) : session.status === 'running' ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  ) : session.status === 'paused' ? (
                    <Pause className="w-3.5 h-3.5 text-yellow-500" />
                  ) : session.status === 'completed' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : session.status === 'failed' ? (
                    <X className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  {/* Session ID */}
                  <span className="text-xs font-mono text-muted-foreground">
                    {session.id.slice(0, 8)}...
                  </span>
                  {/* Attempt # */}
                  <span className="text-xs text-foreground font-medium">
                    #{session.attemptNumber ?? idx + 1}
                  </span>
                  {/* Resume Mode Badge */}
                  {session.resumeMode && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        session.resumeMode === 'retry' && "bg-yellow-500/20 text-yellow-600",
                        session.resumeMode === 'renew' && "bg-blue-500/20 text-blue-600",
                        session.resumeMode === 'fork' && "bg-purple-500/20 text-purple-600"
                      )}
                    >
                      {session.resumeMode}
                    </span>
                  )}
                  {/* Status */}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto",
                      session.status === 'queued' && "bg-gray-500/20 text-gray-500",
                      session.status === 'running' && "bg-blue-500/20 text-blue-500",
                      session.status === 'paused' && "bg-yellow-500/20 text-yellow-600",
                      session.status === 'completed' && "bg-green-500/20 text-green-600",
                      session.status === 'failed' && "bg-red-500/20 text-red-500",
                      session.status === 'cancelled' && "bg-gray-500/20 text-gray-500"
                    )}
                  >
                    {session.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-4">
                  <span>
                    {new Date(session.createdAt).toLocaleDateString()}{' '}
                    {new Date(session.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {session.resumedFromSessionId && (
                    <span className="flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5" />
                      from {session.resumedFromSessionId.slice(0, 6)}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
});
