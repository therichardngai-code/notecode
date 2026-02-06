import { useState, useEffect } from 'react';
import { X, GitBranch, FileCode, Check, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { gitApi, type GitCommitApproval, type FileDiff } from '@/adapters/api/git-api';

interface GitCommitApprovalDialogProps {
  approval: GitCommitApproval | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved?: () => void;
  onRejected?: () => void;
}

export function GitCommitApprovalDialog({
  approval,
  isOpen,
  onClose,
  onApproved,
  onRejected,
}: GitCommitApprovalDialogProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
  const [discardChanges, setDiscardChanges] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch full approval details with diffs
  useEffect(() => {
    if (!approval || !isOpen) return;
    setCommitMessage(approval.commitMessage);
    setLoading(true);
    gitApi.getApproval(approval.id)
      .then(res => {
        setDiffs(res.diff?.files || []);
        // Expand first file by default
        if (res.diff?.files?.[0]) {
          setExpandedFiles(new Set([res.diff.files[0].path]));
        }
      })
      .catch(err => {
        console.error('Failed to fetch approval details:', err);
        setDiffs([]);
      })
      .finally(() => setLoading(false));
  }, [approval, isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDiffs([]);
      setDiscardChanges(false);
      setExpandedFiles(new Set());
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleApprove = async () => {
    if (!approval) return;
    setProcessing('approve');
    setErrorMessage(null);
    try {
      await gitApi.approveCommit(approval.id, { commitMessage });
      onApproved?.();
      onClose();
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code;
      if (errorCode === 'GIT_NOT_INITIALIZED') {
        setErrorMessage('Git is not initialized in this project. Please initialize git first.');
      } else if (errorCode === 'NO_CHANGES') {
        // All changes already committed — auto-dismiss the approval
        setErrorMessage(null);
        onApproved?.();
        onClose();
      } else {
        setErrorMessage('Failed to approve commit. Please try again.');
      }
      console.error('Failed to approve commit:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    setProcessing('reject');
    try {
      await gitApi.rejectCommit(approval.id, { discardChanges });
      onRejected?.();
      onClose();
    } catch (err) {
      console.error('Failed to reject commit:', err);
    } finally {
      setProcessing(null);
    }
  };

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (!isOpen || !approval) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-medium text-foreground">Review Commit</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Task Info */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-foreground mb-1">
                {approval.task?.title || 'Commit'}
              </h3>
              {approval.task?.branchName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GitBranch className="w-3 h-3" />
                  <span>{approval.task.branchName}</span>
                </div>
              )}
            </div>

            {/* Commit Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Commit Message
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full h-20 px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:border-primary/50 resize-none"
                placeholder="Enter commit message..."
              />
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="text-muted-foreground">
                {approval.filesChanged.length} file{approval.filesChanged.length !== 1 ? 's' : ''} changed
              </span>
              <span className="text-green-500">+{approval.diffSummary.additions}</span>
              <span className="text-red-500">-{approval.diffSummary.deletions}</span>
            </div>

            {/* Diffs */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {diffs.map((file) => (
                  <div key={file.path} className="border border-border rounded-lg overflow-hidden">
                    {/* File Header */}
                    <button
                      onClick={() => toggleFile(file.path)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground flex-1 text-left truncate">
                        {file.path}
                      </span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        file.status === 'added' && "bg-green-500/20 text-green-600",
                        file.status === 'deleted' && "bg-red-500/20 text-red-600",
                        file.status === 'modified' && "bg-yellow-500/20 text-yellow-600",
                        file.status === 'renamed' && "bg-blue-500/20 text-blue-600"
                      )}>
                        {file.status}
                      </span>
                      <span className="text-xs text-green-500">+{file.additions}</span>
                      <span className="text-xs text-red-500">-{file.deletions}</span>
                    </button>

                    {/* File Diff */}
                    {expandedFiles.has(file.path) && file.patch && (
                      <pre className="p-3 text-xs font-mono overflow-x-auto bg-background max-h-[300px] overflow-y-auto">
                        {file.patch.split('\n').map((line, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "px-2 -mx-2",
                              line.startsWith('+') && !line.startsWith('+++') && "bg-green-500/10 text-green-400",
                              line.startsWith('-') && !line.startsWith('---') && "bg-red-500/10 text-red-400",
                              line.startsWith('@@') && "text-blue-400 bg-blue-500/10"
                            )}
                          >
                            {line}
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3">
            {/* Error message */}
            {errorMessage && (
              <div className="mb-3 px-3 py-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {errorMessage}
              </div>
            )}
            <div className="flex items-center justify-between">
              {/* Reject Options */}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={discardChanges}
                  onChange={(e) => setDiscardChanges(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Discard changes on reject</span>
              </label>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing !== null}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {processing === 'reject' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing !== null || !commitMessage.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {processing === 'approve' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve & Commit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
