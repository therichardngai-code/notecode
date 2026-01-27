import { useState, useEffect } from 'react';
import { Inbox, RefreshCw, PanelLeftClose, GitBranch, Check, X, FileCode, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { gitApi, type GitCommitApproval } from '@/adapters/api/git-api';

function getRelativeTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

interface InboxPanelProps {
  onClose?: () => void;
  projectId?: string;
  onViewApproval?: (approval: GitCommitApproval) => void;
}

export function InboxPanel({ onClose, projectId, onViewApproval }: InboxPanelProps) {
  const [approvals, setApprovals] = useState<GitCommitApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending git approvals
  const fetchApprovals = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await gitApi.listApprovals({ projectId, status: 'pending' });
      setApprovals(res.approvals);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [projectId]);

  // Handle approve
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await gitApi.approveCommit(id);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject
  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await gitApi.rejectCommit(id, { discardChanges: false });
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Inbox</span>
        <div className="flex items-center gap-1">
          <button onClick={fetchApprovals} className="p-1.5 rounded-lg hover:bg-muted" title="Refresh">
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Git Commit Approvals Section */}
        {approvals.length > 0 && (
          <div className="border-b border-border">
            <div className="px-3 py-2 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" />
                Pending Commit Approvals ({approvals.length})
              </span>
            </div>
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="group px-3 py-2.5 hover:bg-muted/50 border-b border-border/50 last:border-b-0"
              >
                <div className="flex items-start gap-2.5">
                  <GitBranch className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onViewApproval?.(approval)}
                      className="text-sm font-medium text-foreground hover:text-primary block truncate text-left w-full"
                    >
                      {approval.task?.title || approval.commitMessage}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5">
                      {approval.task?.branchName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {approval.task.branchName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(approval.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                      <FileCode className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{approval.filesChanged.length} files</span>
                      <span className="text-green-500">+{approval.diffSummary.additions}</span>
                      <span className="text-red-500">-{approval.diffSummary.deletions}</span>
                    </div>
                  </div>
                </div>
                {/* Quick Actions */}
                <div className="flex items-center gap-1.5 mt-2 pl-6">
                  <button
                    onClick={() => handleApprove(approval.id)}
                    disabled={processingId === approval.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50"
                  >
                    {processingId === approval.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(approval.id)}
                    disabled={processingId === approval.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                  <button
                    onClick={() => onViewApproval?.(approval)}
                    className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    View Diff
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && approvals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No pending approvals</p>
            <p className="text-xs text-muted-foreground mt-1">
              Git commit approvals will appear here
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
