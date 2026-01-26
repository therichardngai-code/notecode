/**
 * Projects Query Hooks
 * React Query hooks for project data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type CreateProjectRequest, type UpdateProjectRequest } from '@/adapters/api';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: { search?: string; favorite?: boolean }) => [...projectKeys.lists(), filters] as const,
  recent: (limit?: number) => [...projectKeys.all, 'recent', limit] as const,
  favorites: () => [...projectKeys.all, 'favorites'] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/**
 * Fetch all projects
 */
export function useProjects(params?: { search?: string; favorite?: boolean }) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsApi.list(params),
    select: (data) => data.projects,
  });
}

/**
 * Fetch recent projects
 */
export function useRecentProjects(limit = 10) {
  return useQuery({
    queryKey: projectKeys.recent(limit),
    queryFn: () => projectsApi.getRecent(limit),
    select: (data) => data.projects,
  });
}

/**
 * Fetch favorite projects
 */
export function useFavoriteProjects() {
  return useQuery({
    queryKey: projectKeys.favorites(),
    queryFn: () => projectsApi.getFavorites(),
    select: (data) => data.projects,
  });
}

/**
 * Fetch single project
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    select: (data) => data.project,
    enabled: !!id,
  });
}

/**
 * Create project mutation
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Update project mutation
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Delete project mutation
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
