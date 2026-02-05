import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, FileCode, Wrench, Terminal, Filter, ExternalLink } from 'lucide-react';
import type { Approval, ApprovalStatus, ApprovalType } from '../../../domain/entities';

interface ApprovalHistoryProps {
  approvals: Approval[];
  onApprovalClick?: (approval: Approval) => void;
}

export function ApprovalHistory({ approvals, onApprovalClick }: ApprovalHistoryProps) {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<ApprovalType | 'all'>('all');

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      return true;
    });
  }, [approvals, filterStatus, filterType]);

  const typeIcons: Record<ApprovalType, React.ElementType> = {
    diff: FileCode,
    tool: Wrench,
    command: Terminal,
  };

  const statusIcons: Record<ApprovalStatus, React.ElementType> = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    timeout: Clock,
  };

  const statusColors: Record<ApprovalStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    approved: 'bg-green-500/20 text-green-600 dark:text-green-400',
    rejected: 'bg-red-500/20 text-red-600 dark:text-red-400',
    timeout: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Approval History</h3>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ApprovalStatus | 'all')}
              className="pl-7 pr-3 py-1.5 text-xs border border-border rounded-md bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="timeout">Timeout</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ApprovalType | 'all')}
            className="px-3 py-1.5 text-xs border border-border rounded-md bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All types</option>
            <option value="diff">File changes</option>
            <option value="tool">Tool use</option>
            <option value="command">Commands</option>
          </select>
        </div>
      </div>

      {/* History list */}
      {filteredApprovals.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No approval history found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredApprovals.map((approval) => {
            const TypeIcon = typeIcons[approval.type];
            const StatusIcon = statusIcons[approval.status];
            const statusColor = statusColors[approval.status];

            return (
              <div
                key={approval.id}
                onClick={() => onApprovalClick?.(approval)}
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <TypeIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground truncate">
                      {approval.type === 'diff' && approval.payload.type === 'diff'
                        ? approval.payload.filePath
                        : approval.type === 'tool' && approval.payload.type === 'tool'
                        ? approval.payload.toolName
                        : approval.type === 'command' && approval.payload.type === 'command'
                        ? approval.payload.command
                        : 'Unknown'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {approval.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {approval.decidedBy || 'System'} · {new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="capitalize">{approval.status}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprovalClick?.(approval);
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="View details"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
