/**
 * Tasks Query Hooks
 * React Query hooks for task data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tasksApi,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type MoveTaskRequest,
  type TaskStatus,
  type TaskPriority,
} from '@/adapters/api';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: {
    projectId?: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    search?: string;
    agentId?: string;
  }) => [...taskKeys.lists(), filters] as const,
  stats: (projectId?: string) => [...taskKeys.all, 'stats', projectId] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * Fetch all tasks (optionally filtered by project)
 */
export function useTasks(params?: {
  projectId?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
  agentId?: string;
}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.list(params),
    select: (data) => data.tasks,
  });
}

/**
 * Fetch task stats
 */
export function useTaskStats(projectId: string) {
  return useQuery({
    queryKey: taskKeys.stats(projectId),
    queryFn: () => tasksApi.getStats(projectId),
    select: (data) => data.counts,
    enabled: !!projectId,
  });
}

/**
 * Fetch single task
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getById(id),
    select: (data) => data.task,
    enabled: !!id,
  });
}

/**
 * Create task mutation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.create(data),
    onSuccess: (_, variables) => {
      // Invalidate ALL task lists (Board view uses no filter, others use projectId filter)
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(variables.projectId) });
    },
  });
}

/**
 * Update task mutation
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      tasksApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(result.task.id) });
      // Invalidate ALL task lists (Board view uses no filter)
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(result.task.projectId) });
    },
  });
}

/**
 * Move task mutation (drag & drop)
 */
export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveTaskRequest }) =>
      tasksApi.move(id, data),
    onSuccess: (result) => {
      // Invalidate ALL task lists (Board view uses no filter)
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(result.task.projectId) });
    },
  });
}

/**
 * Delete task mutation
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
