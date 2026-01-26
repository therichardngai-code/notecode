import { useState } from 'react';
import { LayoutList, Plus, Search } from 'lucide-react';
import type { SessionStatus } from '../../../domain/entities';
import { SessionCard } from './SessionCard';
import { useSessions, type SessionFilters } from '../hooks/useSessions';
import { Button } from '../../../shared/components/ui';
import { Input } from '../../../shared/components/ui';
import { cn } from '../../../shared/lib/utils';

interface SessionListProps {
  hideHeader?: boolean;
  filters?: SessionFilters;
  onSessionClick?: (sessionId: string) => void;
  onNewSession?: () => void;
}

type StatusFilter = 'all' | SessionStatus;

const statusFilterOptions: Array<{
  id: StatusFilter;
  label: string;
  color?: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running', color: '#10b981' },
  { id: 'paused', label: 'Paused', color: '#f59e0b' },
  { id: 'completed', label: 'Completed', color: '#8b5cf6' },
  { id: 'archived', label: 'Archived', color: '#9ca3af' },
];

export function SessionList({
  hideHeader,
  filters,
  onSessionClick,
  onNewSession,
}: SessionListProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [localFilter, setLocalFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combine filters
  const combinedFilters: SessionFilters = {
    ...filters,
    status: localFilter === 'all' ? undefined : [localFilter],
    searchQuery,
  };

  const { sessions, isLoading } = useSessions(combinedFilters);

  const activeCount = sessions.filter((s) => s.status === 'running').length;

  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    onSessionClick?.(sessionId);
  };

  const handleOpenInNewTab = (sessionId: string) => {
    // TODO: Implement navigation to new tab
    console.log('Open in new tab:', sessionId);
  };

  const handleMoveToArchived = async (sessionId: string) => {
    // TODO: Implement archive functionality
    console.log('Move to archived:', sessionId);
  };

  const handleDelete = async (sessionId: string) => {
    // TODO: Implement delete with confirmation
    if (
      confirm(
        'Are you sure you want to delete this session? This action cannot be undone.'
      )
    ) {
      console.log('Delete session:', sessionId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
              <LayoutList className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Sessions</h1>
              {activeCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {activeCount} active
                </span>
              )}
            </div>
          </div>
          {onNewSession && (
            <Button onClick={onNewSession} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Session
            </Button>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="px-6 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
        <span className="text-sm text-muted-foreground mr-1">Status:</span>
        {statusFilterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setLocalFilter(option.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              localFilter === option.id
                ? 'bg-background border border-border text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {option.color && (
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  option.id === 'all' && 'border border-muted-foreground'
                )}
                style={{ backgroundColor: option.color }}
              />
            )}
            {option.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading sessions...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <LayoutList className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              No sessions found
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery
                ? 'Try a different search'
                : 'Start a new coding session'}
            </p>
            {onNewSession && (
              <Button onClick={onNewSession} className="gap-2">
                <Plus className="w-4 h-4" />
                New Session
              </Button>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isSelected={selectedSessionId === session.id}
                onSelect={() => handleSessionClick(session.id)}
                onOpenInNewTab={handleOpenInNewTab}
                onMoveToArchived={handleMoveToArchived}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
