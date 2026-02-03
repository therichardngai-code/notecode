import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sessionsApi, type ApprovalRequest } from '@/adapters/api/sessions-api';
import { gitApi, type GitCommitApproval } from '@/adapters/api/git-api';

// Query key for git approvals (used by SSE hook to invalidate)
export const gitApprovalKeys = {
  all: ['git-approvals'] as const,
  task: (taskId: string) => [...gitApprovalKeys.all, taskId] as const,
};

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

  // Fetch pending approvals when session changes
  useEffect(() => {
    if (!activeSessionId) return;

    sessionsApi.getPendingApprovals(activeSessionId)
      .then(res => setPendingApprovals(res.approvals))
      .catch(() => setPendingApprovals([]));
  }, [activeSessionId]);

  // Fetch git commit approvals using React Query (enables SSE invalidation)
  const { data: gitCommitApprovals = [] } = useQuery({
    queryKey: gitApprovalKeys.task(taskId),
    queryFn: () => gitApi.getTaskApprovals(taskId),
    select: (data) => data.approvals,
    enabled: !!taskId,
    staleTime: 0, // Always refetch
  });

  return {
    pendingApprovals,
    setPendingApprovals,
    processingApproval,
    setProcessingApproval,
    gitCommitApprovals,
  };
}
