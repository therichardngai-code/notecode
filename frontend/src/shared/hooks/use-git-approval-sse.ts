/**
 * Git Approval SSE Hook
 * Listens for git:approval:created events via SSE and updates task status in real-time
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from './use-tasks-query';
import { gitApprovalKeys } from './use-approval-state';

interface GitApprovalCreatedEvent {
  type: 'git:approval:created';
  aggregateId: string;
  projectId: string;
  taskId: string;
  taskStatus: string;
  commitMessage: string;
  filesChanged: string[];
  diffSummary: {
    files: number;
    additions: number;
    deletions: number;
  };
}

interface UseGitApprovalSSEOptions {
  enabled?: boolean;
}

/**
 * Hook to listen for git:approval:created SSE events
 * Automatically updates task status in React Query cache when received
 */
export function useGitApprovalSSE(options: UseGitApprovalSSEOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Connect to SSE endpoint
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${baseUrl}/sse/notifications`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle git:approval:created event
        if (data.type === 'git:approval:created') {
          const gitEvent = data as GitApprovalCreatedEvent;
          console.log('[SSE] git:approval:created received:', gitEvent.taskId, gitEvent.taskStatus);

          // Invalidate task detail to refetch with new status
          queryClient.invalidateQueries({ queryKey: taskKeys.detail(gitEvent.taskId) });

          // Invalidate task lists to update Board view
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

          // Invalidate task diffs
          queryClient.invalidateQueries({ queryKey: ['task-diffs', gitEvent.taskId] });

          // Invalidate git approvals for Git tab real-time update
          queryClient.invalidateQueries({ queryKey: gitApprovalKeys.task(gitEvent.taskId) });
        }
      } catch (error) {
        // Ignore parse errors (heartbeat messages, etc.)
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [enabled, queryClient]);
}
