/**
 * Projects API
 * HTTP client for project endpoints including chat mode and file uploads
 */

import { apiClient } from './api-client';
import type { Session } from './sessions-api';

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

// Chat Mode types
export interface StartChatRequest {
  message: string;
  attachments?: string[];
  provider?: 'anthropic' | 'google' | 'openai';
  model?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  disableWebTools?: boolean;
}

export interface ChatTask {
  id: string;
  projectId: string;
  title: string;
  workflowStage: 'chat';
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  lastSession?: Session;
}

// File Upload types
export interface UploadedFile {
  id: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
}

// API Response types
interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

interface StartChatResponse {
  task: ChatTask;
  session: Session;
  wsUrl: string;
}

interface ChatsResponse {
  chats: Chat[];
}

interface UploadResponse extends UploadedFile {}

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
   * Find project by path (returns null if not exists)
   */
  getByPath: (path: string) =>
    apiClient.get<{ project: Project | null; exists: boolean }>('/api/projects/by-path', { path }),

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
    apiClient.post<ProjectResponse>(`/api/projects/${id}/access`, {}),

  /**
   * Delete project
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/projects/${id}`),

  // ============================================
  // CHAT MODE APIs
  // ============================================

  /**
   * Start chat session (auto-creates ephemeral task)
   */
  startChat: (projectId: string, data: StartChatRequest) =>
    apiClient.post<StartChatResponse>(`/api/projects/${projectId}/chat`, data),

  /**
   * List chat history for project
   */
  listChats: (projectId: string) =>
    apiClient.get<ChatsResponse>(`/api/projects/${projectId}/chats`),

  /**
   * Delete chat (and associated task/sessions)
   */
  deleteChat: (projectId: string, chatId: string) =>
    apiClient.delete<{ success: boolean }>(`/api/projects/${projectId}/chats/${chatId}`),

  // ============================================
  // FILE UPLOAD APIs
  // ============================================

  /**
   * Upload file (for clipboard paste screenshots)
   * Uses FormData for multipart upload
   */
  uploadFile: async (projectId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/uploads`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },
};
