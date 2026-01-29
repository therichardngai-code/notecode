/**
 * Session History component - shows session lineage with resume modes
 * Displays tree view of session attempts with status icons
 */

import { Clock, Play, CheckCircle, X } from 'lucide-react';
import type { Session, SessionResumeMode } from '@/adapters/api/sessions-api';

export interface SessionHistoryProps {
  sessions: Session[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  if (sessions.length === 0) return null;

  // Sort by createdAt ascending (oldest first for tree view)
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const getModeLabel = (mode: SessionResumeMode | null, idx: number): string => {
    if (idx === 0 || !mode) return 'initial';
    return mode;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-3 h-3 text-green-500" />;
    if (status === 'failed') return <X className="w-3 h-3 text-red-500" />;
    if (status === 'running') return <Play className="w-3 h-3 text-blue-500" />;
    return <Clock className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="text-xs space-y-1 mb-3">
      <span className="text-muted-foreground font-medium">Session History:</span>
      <div className="pl-2 border-l border-border/50 space-y-1">
        {sortedSessions.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 text-muted-foreground">
            <span className="w-4">{idx === sortedSessions.length - 1 ? '└' : '├'}</span>
            {getStatusIcon(s.status)}
            <span className="text-foreground">#{s.attemptNumber ?? idx + 1}</span>
            <span className="text-muted-foreground/70">({getModeLabel(s.resumeMode ?? null, idx)})</span>
            <span className="capitalize">{s.status}</span>
            {idx === sortedSessions.length - 1 && s.status === 'running' && (
              <span className="text-blue-500 font-medium">← current</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
