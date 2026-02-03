/**
 * Git Tab - Combined Approval Panel
 * Shows commit approval with diffs preview for batch approve/reject
 */

import { memo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GitCommit, CheckCircle, XCircle, FileCode, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { gitApi, type GitCommitApproval } from '@/adapters/api/git-api';
import type { TaskStatus } from '@/adapters/api/tasks-api';
import type { UIDiff } from '@/shared/types/task-detail-types';

interface GitTabProps {
  taskId: string;
  taskStatus?: TaskStatus;
  approval: GitCommitApproval | null;
  sessionDiffs: UIDiff[];
}

export const GitTab = memo(function GitTab({
  taskId,
  taskStatus,
  approval,
  sessionDiffs,
}: GitTabProps) {
  const queryClient = useQueryClient();
  const [commitMessage, setCommitMessage] = useState(approval?.commitMessage || '');

  const approveMutation = useMutation({
    mutationFn: () => gitApi.approveCommit(approval!.id, { commitMessage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['git-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['session-diffs'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => gitApi.rejectCommit(approval!.id, { discardChanges: true }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['git-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['session-diffs'] });
      // Show revert summary
      if (result.revertResult) {
        console.log(`Reverted ${result.revertResult.reverted}/${result.revertResult.total} files`);
      }
    },
  });

  const isPending = approval?.status === 'pending';
  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  // No approval pending
  if (!approval) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <GitCommit className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No commit approval pending</p>
        <p className="text-xs mt-1">Complete the task to create a commit</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      {taskStatus === 'review' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
          <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-600 dark:text-blue-400">Awaiting Review</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Review the changes below and approve or reject the commit.
            </p>
          </div>
        </div>
      )}

      {/* Commit Info */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <GitCommit className="w-4 h-4" />
          Commit Approval
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={!isPending || isLoading}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm disabled:opacity-50"
              placeholder="Enter commit message..."
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{approval.filesChanged.length} files</span>
            <span className="text-green-500">+{approval.diffSummary.additions}</span>
            <span className="text-red-500">-{approval.diffSummary.deletions}</span>
          </div>
        </div>
      </div>

      {/* Diffs Preview */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <FileCode className="w-4 h-4" />
          Changes to Review
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {isPending ? 'Review all changes before approving.' : `Status: ${approval.status}`}
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sessionDiffs.length > 0 ? (
            sessionDiffs.map((diff) => (
              <div key={diff.id} className="flex items-center gap-2 px-3 py-2 rounded bg-muted/50 text-sm">
                <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{diff.filename}</span>
                <span className="text-green-500 text-xs">+{diff.additions}</span>
                {diff.deletions > 0 && <span className="text-red-500 text-xs">-{diff.deletions}</span>}
              </div>
            ))
          ) : (
            approval.filesChanged.map((file) => (
              <div key={file} className="flex items-center gap-2 px-3 py-2 rounded bg-muted/50 text-sm">
                <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{file}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
          >
            {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject & Revert All
          </button>
          <button
            onClick={() => approveMutation.mutate()}
            disabled={isLoading || !commitMessage.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve & Commit
          </button>
        </div>
      )}

      {/* Resolved Status */}
      {!isPending && (
        <div className={cn(
          "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium",
          approval.status === 'approved' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
        )}>
          {approval.status === 'approved' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Committed: {approval.commitSha?.slice(0, 7)}
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Rejected & Reverted
            </>
          )}
        </div>
      )}
    </div>
  );
});
