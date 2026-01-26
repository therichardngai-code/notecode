/**
 * Projects API
 * HTTP client for project endpoints
 */

import { apiClient } from './api-client';

// Types matching backend entities
export interface Project {
  id: string;
  name: string;
  path: string;
  isFavorite: boolean;
  lastAccessedAt: string | null;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  path: string;
  isFavorite?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  isFavorite?: boolean;
}

// API Response types
interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

/**
 * Projects API methods
 */
export const projectsApi = {
  /**
   * List all projects with optional filters
   */
  list: (params?: { search?: string; favorite?: boolean }) =>
    apiClient.get<ProjectsResponse>('/api/projects', {
      search: params?.search,
      favorite: params?.favorite,
    }),

  /**
   * Get recent projects
   */
  getRecent: (limit = 10) =>
    apiClient.get<ProjectsResponse>('/api/projects/recent', { limit }),

  /**
   * Get favorite projects
   */
  getFavorites: () =>
    apiClient.get<ProjectsResponse>('/api/projects/favorites'),

  /**
   * Get single project by ID
   */
  getById: (id: string) =>
    apiClient.get<ProjectResponse>(`/api/projects/${id}`),

  /**
   * Create new project
   */
  create: (data: CreateProjectRequest) =>
    apiClient.post<ProjectResponse>('/api/projects', data),

  /**
   * Update project
   */
  update: (id: string, data: UpdateProjectRequest) =>
    apiClient.patch<ProjectResponse>(`/api/projects/${id}`, data),

  /**
   * Record project access (updates lastAccessedAt)
   */
  recordAccess: (id: string) =>
    apiClient.post<ProjectResponse>(`/api/projects/${id}/access`),

  /**
   * Delete project
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/projects/${id}`),
};
