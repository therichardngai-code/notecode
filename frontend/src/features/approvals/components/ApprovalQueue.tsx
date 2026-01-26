import { useState, useMemo } from 'react';
import { FileCode, Wrench, Terminal, Clock, Filter, CheckCircle } from 'lucide-react';
import type { Approval, ApprovalType } from '../../../domain/entities';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import { DiffApproval } from './DiffApproval';

interface ApprovalQueueProps {
  sessionId?: string;
  onApprovalClick?: (approval: Approval) => void;
}

export function ApprovalQueue({ sessionId, onApprovalClick }: ApprovalQueueProps) {
  const { approvals, loading, error } = usePendingApprovals(sessionId);
  const [filterType, setFilterType] = useState<ApprovalType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const filteredApprovals = useMemo(() => {
    let filtered = approvals;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // Sort by timestamp
    filtered = [...filtered].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [approvals, filterType, sortBy]);

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  const typeIcons: Record<ApprovalType, React.ElementType> = {
    diff: FileCode,
    tool: Wrench,
    command: Terminal,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 animate-spin" />
          Loading approvals...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-500/50 rounded-lg bg-red-500/10 text-red-600 text-sm">
        Error loading approvals: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Pending Approvals</h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              {pendingCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ApprovalType | 'all')}
              className="pl-7 pr-3 py-1.5 text-xs border border-border rounded-md bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All types</option>
              <option value="diff">File changes</option>
              <option value="tool">Tool use</option>
              <option value="command">Commands</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="px-3 py-1.5 text-xs border border-border rounded-md bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Approval list */}
      {filteredApprovals.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((approval) => {
            const Icon = typeIcons[approval.type];

            return (
              <div
                key={approval.id}
                onClick={() => onApprovalClick?.(approval)}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {approval.type === 'diff' && approval.payload.type === 'diff'
                          ? approval.payload.filePath
                          : approval.type === 'tool' && approval.payload.type === 'tool'
                          ? approval.payload.toolName
                          : approval.type === 'command' && approval.payload.type === 'command'
                          ? approval.payload.command
                          : 'Unknown'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {approval.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(approval.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Show diff preview for diff approvals */}
                {approval.type === 'diff' && (
                  <DiffApproval approval={approval} showActions={false} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
