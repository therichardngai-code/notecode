/**
 * Sessions Query Hooks
 * React Query hooks for session data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, type StartSessionRequest, tasksApi } from '@/adapters/api';
import { taskKeys } from './use-tasks-query';

// Query keys
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (taskId?: string) => [...sessionKeys.lists(), taskId] as const,
  running: () => [...sessionKeys.all, 'running'] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  messages: (id: string) => [...sessionKeys.all, 'messages', id] as const,
  diffs: (id: string) => [...sessionKeys.all, 'diffs', id] as const,
};

/**
 * Fetch sessions with optional task filter
 */
export function useSessions(params?: { taskId?: string; limit?: number }) {
  return useQuery({
    queryKey: sessionKeys.list(params?.taskId),
    queryFn: () => sessionsApi.list(params),
    select: (data) => data.sessions,
  });
}

/**
 * Fetch running sessions
 */
export function useRunningSessions() {
  return useQuery({
    queryKey: sessionKeys.running(),
    queryFn: () => sessionsApi.getRunning(),
    select: (data) => data.sessions,
    refetchInterval: 5000, // Poll every 5s for running sessions
  });
}

/**
 * Fetch single session
 */
export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => sessionsApi.getById(id),
    select: (data) => data.session,
    enabled: !!id,
  });
}

/**
 * Fetch session messages
 * Uses placeholderData to keep previous messages during session transitions (Resume flow)
 * This prevents flash of empty state when switching between sessions with same providerSessionId
 */
export function useSessionMessages(id: string, limit = 50) {
  return useQuery({
    queryKey: sessionKeys.messages(id),
    queryFn: () => sessionsApi.getMessages(id, limit),
    select: (data) => data.messages,
    enabled: !!id,
    placeholderData: (previousData) => previousData, // Keep previous during refetch
  });
}

/**
 * Fetch session diffs (file changes)
 */
export function useSessionDiffs(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.diffs(sessionId),
    queryFn: () => sessionsApi.getDiffs(sessionId),
    select: (data) => data.diffs,
    enabled: !!sessionId,
  });
}

/**
 * Fetch all messages for a task (across all sessions)
 * Replaces useSessionMessages for cumulative conversation view
 *
 * Phase 3: Backend filtering - sessionIds passed to API for SQLite filtering
 *
 * @param taskId - Task ID to fetch messages for
 * @param limit - Maximum number of messages to fetch
 * @param filterSessionIds - Optional: Array of sessionIds to filter by (for Renew mode)
 *                           Backend filters in SQLite (Phase 3 optimization).
 *                           If null/undefined, all messages are returned (cumulative).
 */
export function useTaskMessages(
  taskId: string | undefined | null,
  limit = 200,
  filterSessionIds?: string[] | null
) {
  return useQuery({
    queryKey: ['task-messages', taskId, filterSessionIds?.join(',') || 'all'],
    queryFn: async () => {
      const result = await tasksApi.getMessages(taskId!, limit, filterSessionIds);
      return result;
    },
    placeholderData: (previousData) => previousData, // Keep previous data during refetch to prevent scroll jump
    select: (data) => {
      // Convert task messages format to session messages format (Message interface)
      // Backend already filtered by sessionIds (Phase 3), so no client-side filtering needed
      const converted = data.messages.map(msg => ({
        id: msg.id,
        sessionId: msg.sessionId,
        role: msg.role as 'user' | 'assistant' | 'system',
        blocks: msg.blocks || [],
        timestamp: msg.timestamp,
        tokenCount: null,
        toolName: msg.toolName || null,
        toolInput: null,
        toolResult: null,
      }));
      return converted;
    },
    enabled: !!taskId,
    staleTime: 0, // Always consider data stale - force refetch
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus (too aggressive)
  });
}

/**
 * Start session mutation
 */
export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StartSessionRequest) => sessionsApi.start(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.running() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
      // Invalidate task messages to refetch cumulative messages after Resume
      queryClient.invalidateQueries({ queryKey: ['task-messages', variables.taskId] });
    },
  });
}

/**
 * Pause session mutation
 */
export function usePauseSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Resume session mutation
 */
export function useResumeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.resume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      // Invalidate all task messages to refetch cumulative messages after Resume
      queryClient.invalidateQueries({ queryKey: ['task-messages'] });
    },
  });
}

/**
 * Stop session mutation
 */
export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Delete session mutation
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
