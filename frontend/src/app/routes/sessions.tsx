import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { LayoutList, Play, Pause, Clock, Calendar, MoreHorizontal, Plus, FolderOpen, ExternalLink, Trash2, Loader2, Square, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { sessionStatusConfig, sessionStatusFilterOptions, type SessionStatusId, type SessionStatusFilterId } from '@/shared/config/task-config';
import type { Session as ApiSession } from '@/adapters/api/sessions-api';

// Redirect /sessions to /tasks - Sessions is a view mode within Tasks
export const Route = createFileRoute('/sessions')({
  component: () => <Navigate to="/tasks" />,
});

// UI Session type (mapped from API)
export interface UISession {
  id: string;
  name: string;
  workingDir: string;
  status: SessionStatusId;
  duration: string;
  lastActive: string;
  taskId: string;
  provider?: string | null;
}

// Format duration from milliseconds
export function formatDuration(ms: number | null): string {
  if (!ms) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Format relative time
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

// Map API Session to UI Session
export function mapApiSessionToUI(apiSession: ApiSession): UISession {
  return {
    id: apiSession.id,
    name: apiSession.name || `Session ${apiSession.id.slice(0, 8)}`,
    workingDir: apiSession.workingDir,
    status: apiSession.status,
    duration: formatDuration(apiSession.durationMs),
    lastActive: formatRelativeTime(apiSession.endedAt || apiSession.startedAt || apiSession.createdAt),
    taskId: apiSession.taskId,
    provider: apiSession.provider,
  };
}

interface SessionCardProps {
  session: UISession;
  isSelected: boolean;
  onSelect: () => void;
  onOpenInNewTab?: () => void;
  onStop?: () => void;
  onDelete?: () => void;
}

function SessionCard({ session, isSelected, onSelect, onOpenInNewTab, onStop, onDelete }: SessionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const config = sessionStatusConfig[session.status];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Icon based on session execution status
  const StatusIcon = () => {
    switch (session.status) {
      case 'running':
        return <Play className="w-4 h-4" style={{ color: config.color, fill: config.color }} />;
      case 'paused':
        return <Pause className="w-4 h-4" style={{ color: config.color }} />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" style={{ color: config.color }} />;
      case 'cancelled':
        return <Square className="w-4 h-4" style={{ color: config.color }} />;
      default:
        return <FolderOpen className="w-4 h-4" style={{ color: config.color }} />;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border transition-colors text-left group cursor-pointer',
        isSelected ? 'border-primary bg-primary/5' : 'border-sidebar-border bg-sidebar hover:bg-sidebar-accent'
      )}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
        <StatusIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-medium text-sm text-foreground truncate">{session.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1.5" style={{ backgroundColor: config.bgColor, color: config.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate mb-2">{session.workingDir}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.duration}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {session.lastActive}
          </span>
        </div>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn('p-1 rounded hover:bg-muted transition-colors cursor-pointer', showMenu ? 'opacity-100 bg-muted' : 'opacity-0 group-hover:opacity-100')}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </div>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenInNewTab?.();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </div>
            {session.status === 'running' && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onStop?.();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent transition-colors text-left cursor-pointer"
              >
                <Square className="w-4 h-4" />
                Stop session
              </div>
            )}
            <div className="border-t border-border my-1" />
            <div
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Task reference for cross-filtering (includes all filterable fields)
interface TaskRef {
  id: string;
  columnId: string; // task status
  project?: string;
  agent?: string;
  provider?: string;
  model?: string;
  priority?: string;
}

// Filter options for sessions (global filters - same as TaskFilters)
export interface SessionFilters {
  project?: string[];
  agent?: string[];
  provider?: string[];
  model?: string[];
  priority?: string[];
  sessionStatus?: string[];
  taskStatus?: string[];
}

// Helper to filter sessions (global filters - uses parent task for some filters)
function filterSessions(sessions: UISession[], filters: SessionFilters, tasks: TaskRef[] = []): UISession[] {
  return sessions.filter((session) => {
    const parentTask = tasks.find(t => t.id === session.taskId);

    // Session's own provider filter
    if (filters.provider?.length && !filters.provider.includes(session.provider || '')) return false;
    // Session status filter
    if (filters.sessionStatus?.length && !filters.sessionStatus.includes(session.status)) return false;

    // Parent task filters (project, agent, model, priority, taskStatus)
    if (parentTask) {
      if (filters.project?.length && !filters.project.includes(parentTask.project || '')) return false;
      if (filters.agent?.length && !filters.agent.includes(parentTask.agent || '')) return false;
      if (filters.model?.length && !filters.model.includes(parentTask.model || '')) return false;
      if (filters.priority?.length && !filters.priority.includes(parentTask.priority || '')) return false;
      if (filters.taskStatus?.length && !filters.taskStatus.includes(parentTask.columnId)) return false;
    } else if (filters.project?.length || filters.agent?.length || filters.model?.length || filters.priority?.length || filters.taskStatus?.length) {
      // No parent task but task-related filters are set - exclude this session
      return false;
    }
    return true;
  });
}

export interface SessionsViewProps {
  hideHeader?: boolean;
  filters?: SessionFilters;
  searchQuery?: string;
  sessions?: UISession[];  // API sessions (mapped to UI format)
  tasks?: TaskRef[];       // Tasks for cross-filtering by taskStatus
  isLoading?: boolean;
  onSessionClick?: (sessionId: string) => void;
  onOpenInNewTab?: (sessionId: string) => void;
  onStop?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

export function SessionsView({
  hideHeader,
  filters = {},
  searchQuery = '',
  sessions = [],
  tasks = [],
  isLoading = false,
  onSessionClick,
  onOpenInNewTab,
  onStop,
  onDelete
}: SessionsViewProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [localFilter, setLocalFilter] = useState<SessionStatusFilterId>('all');

  // Initialize selected session once when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !initialized) {
      setSelectedSession(sessions[0]?.id || null);
      setInitialized(true);
    }
  }, [sessions.length, initialized]);

  // Apply global filters first
  const globallyFilteredSessions = filterSessions(sessions, filters, tasks);

  // Then apply search and local status filter
  const filteredSessions = globallyFilteredSessions.filter((session) => {
    const matchesSearch = !searchQuery.trim() ||
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.workingDir.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocalFilter = localFilter === 'all' || session.status === localFilter;
    return matchesSearch && matchesLocalFilter;
  });

  const runningSessions = sessions.filter((s) => s.status === 'running').length;

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
    onSessionClick?.(sessionId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - only show if not embedded */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
              <LayoutList className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Sessions</h1>
              {runningSessions > 0 && <span className="text-sm text-muted-foreground">{runningSessions} running</span>}
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      )}

      {/* Status Filter - local filter within Sessions view */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
        <span className="text-sm text-muted-foreground mr-1">Session Status:</span>
        {sessionStatusFilterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setLocalFilter(option.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              localFilter === option.id ? 'bg-background border border-border text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', option.id === 'all' && 'border border-muted-foreground')} style={{ backgroundColor: option.color }} />
            {option.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <LayoutList className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">No sessions found</h2>
            <p className="text-sm text-muted-foreground mb-6">{searchQuery ? 'Try a different search' : 'Start a new coding session'}</p>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isSelected={selectedSession === session.id}
                onSelect={() => handleSessionSelect(session.id)}
                onOpenInNewTab={() => onOpenInNewTab?.(session.id)}
                onStop={() => onStop?.(session.id)}
                onDelete={() => onDelete?.(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
