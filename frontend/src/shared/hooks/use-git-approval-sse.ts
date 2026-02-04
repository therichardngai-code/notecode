/**
 * SSE Notifications Hook
 * Listens for real-time events via SSE and updates React Query cache
 *
 * Supported events:
 * - git:approval:created: Git commit approval created, updates task status and Git tab
 * - task.status.changed: Task status transition, updates Board view and task detail
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from './use-tasks-query';
import { gitApprovalKeys } from './use-approval-state';
import { getSseUrl } from '@/shared/lib/api-config';

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

interface TaskStatusChangedEvent {
  type: 'task.status.changed';
  aggregateId: string;
  taskId: string;
  projectId: string;
  oldStatus: string;
  newStatus: string;
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
    const eventSource = new EventSource(getSseUrl('/sse/notifications'));
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle git:approval:created event
        if (data.type === 'git:approval:created') {
          const gitEvent = data as GitApprovalCreatedEvent;

          // Invalidate task detail to refetch with new status
          queryClient.invalidateQueries({ queryKey: taskKeys.detail(gitEvent.taskId) });

          // Invalidate task lists to update Board view
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

          // Invalidate task diffs
          queryClient.invalidateQueries({ queryKey: ['task-diffs', gitEvent.taskId] });

          // Invalidate git approvals for Git tab real-time update
          queryClient.invalidateQueries({ queryKey: gitApprovalKeys.task(gitEvent.taskId) });
        }

        // Handle task.status.changed event (e.g., REVIEW → IN_PROGRESS on Continue)
        if (data.type === 'task.status.changed') {
          const statusEvent = data as TaskStatusChangedEvent;

          // Invalidate task detail to refetch with new status
          queryClient.invalidateQueries({ queryKey: taskKeys.detail(statusEvent.taskId) });

          // Invalidate task lists to update Board view status badges
          queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
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
