/**
 * Git Status Card component - shows branch info and file changes
 * Displays git branch, staged/unstaged changes, and pending approvals
 */

import { memo } from 'react';
import { GitBranch, CheckCircle, FileCode, Plus, AlertTriangle } from 'lucide-react';
import type { TaskGitStatus } from '@/adapters/api/git-api';

export interface GitStatusCardProps {
  gitStatus: TaskGitStatus | null;
  onViewApproval?: (approvalId: string) => void;
}

export const GitStatusCard = memo(function GitStatusCard({ gitStatus, onViewApproval }: GitStatusCardProps) {
  if (!gitStatus) return null;

  const { branchName, baseBranch, currentBranch, isOnTaskBranch, hasChanges, staged, unstaged, untracked, pendingApproval } = gitStatus;

  // No branch configured
  if (!branchName) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground text-xs">
        <GitBranch className="w-4 h-4" />
        <span>No git branch configured for this task</span>
      </div>
    );
  }

  const totalChanges = staged.length + unstaged.length + untracked.length;

  return (
    <div className="border rounded-lg p-3 mb-4 bg-muted/20">
      {/* Branch Info */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{branchName}</span>
        {!isOnTaskBranch && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600">
            Not on task branch ({currentBranch})
          </span>
        )}
      </div>
      {baseBranch && (
        <div className="text-xs text-muted-foreground mb-3 pl-6">
          Based on: {baseBranch}
        </div>
      )}

      {/* File Changes */}
      {hasChanges && totalChanges > 0 && (
        <div className="space-y-1.5 mb-3">
          {staged.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-green-500">{staged.length} staged</span>
            </div>
          )}
          {unstaged.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <FileCode className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-500">{unstaged.length} modified</span>
            </div>
          )}
          {untracked.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Plus className="w-3 h-3 text-blue-500" />
              <span className="text-blue-500">{untracked.length} untracked</span>
            </div>
          )}
        </div>
      )}

      {/* Pending Approval */}
      {pendingApproval && pendingApproval.status === 'pending' && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs text-yellow-600 flex-1">Pending commit approval</span>
          {onViewApproval && (
            <button
              onClick={() => onViewApproval(pendingApproval.id)}
              className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Review
            </button>
          )}
        </div>
      )}

      {/* Clean State */}
      {!hasChanges && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>Working tree clean</span>
        </div>
      )}
    </div>
  );
});
