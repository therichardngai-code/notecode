import { useState, useEffect } from 'react';
import { sessionsApi, type ApprovalRequest } from '@/adapters/api/sessions-api';
import { gitApi, type GitCommitApproval } from '@/adapters/api/git-api';

interface ApprovalStateParams {
  activeSessionId: string;
  taskId: string;
}

interface UseApprovalStateReturn {
  pendingApprovals: ApprovalRequest[];
  setPendingApprovals: React.Dispatch<React.SetStateAction<ApprovalRequest[]>>;
  processingApproval: string | null;
  setProcessingApproval: React.Dispatch<React.SetStateAction<string | null>>;
  gitCommitApprovals: GitCommitApproval[];
}

/**
 * Manages approval state and fetching for task sessions.
 *
 * Features:
 * - Fetches pending approvals from active session
 * - Fetches git commit approvals for task activity timeline
 * - Exposes state setters for WebSocket hook integration
 *
 * Note: Call this BEFORE useTaskWebSocket to provide setPendingApprovals
 *
 * @param activeSessionId - Current active session ID
 * @param taskId - Task ID for git commit approvals
 */
export function useApprovalState({
  activeSessionId,
  taskId,
}: ApprovalStateParams): UseApprovalStateReturn {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [gitCommitApprovals, setGitCommitApprovals] = useState<GitCommitApproval[]>([]);

  // Fetch pending approvals when session changes
  useEffect(() => {
    if (!activeSessionId) return;

    sessionsApi.getPendingApprovals(activeSessionId)
      .then(res => setPendingApprovals(res.approvals))
      .catch(() => setPendingApprovals([]));
  }, [activeSessionId]);

  // Fetch git commit approvals when task changes
  useEffect(() => {
    if (!taskId) return;

    gitApi.getTaskApprovals(taskId)
      .then(res => setGitCommitApprovals(res.approvals))
      .catch(() => setGitCommitApprovals([]));
  }, [taskId]);

  return {
    pendingApprovals,
    setPendingApprovals,
    processingApproval,
    setProcessingApproval,
    gitCommitApprovals,
  };
}
