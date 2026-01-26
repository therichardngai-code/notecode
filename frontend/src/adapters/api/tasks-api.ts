/**
 * Tasks API
 * HTTP client for task endpoints
 */

import { apiClient } from './api-client';

// Task status and priority types
export type TaskStatus = 'not-started' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'archived';
export type TaskPriority = 'high' | 'medium' | 'low';
export type AgentRole = 'researcher' | 'planner' | 'coder' | 'reviewer' | 'tester';
export type ProviderType = 'anthropic' | 'google' | 'openai';

export interface ToolConfig {
  mode: 'allowlist' | 'blocklist';
  tools: string[];
}

export interface Task {
  id: string;
  projectId: string;
  agentId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: string | null;
  agentRole: AgentRole | null;
  provider: ProviderType | null;
  model: string | null;
  skills: string[];
  tools: ToolConfig | null;
  contextFiles: string[];
  workflowStage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  agentId?: string;
  agentRole?: AgentRole;
  provider?: ProviderType;
  model?: string;
  skills?: string[];
  tools?: ToolConfig;
  contextFiles?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  agentId?: string | null;
  agentRole?: AgentRole | null;
  provider?: ProviderType | null;
  model?: string | null;
}

export interface MoveTaskRequest {
  status: TaskStatus;
  position?: number;
}

export interface TaskStatusCounts {
  'not-started': number;
  'in-progress': number;
  'review': number;
  'done': number;
  'cancelled': number;
  'archived': number;
}

// API Response types
interface TasksResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

interface TaskStatsResponse {
  counts: TaskStatusCounts;
}

/**
 * Tasks API methods
 */
export const tasksApi = {
  /**
   * List tasks by project with optional filters
   */
  list: (projectId: string, params?: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    search?: string;
    agentId?: string;
  }) =>
    apiClient.get<TasksResponse>('/api/tasks', {
      projectId,
      status: params?.status?.join(','),
      priority: params?.priority?.join(','),
      search: params?.search,
      agentId: params?.agentId,
    }),

  /**
   * Get single task by ID
   */
  getById: (id: string) =>
    apiClient.get<TaskResponse>(`/api/tasks/${id}`),

  /**
   * Get task counts by status
   */
  getStats: (projectId: string) =>
    apiClient.get<TaskStatsResponse>('/api/tasks/stats', { projectId }),

  /**
   * Create new task
   */
  create: (data: CreateTaskRequest) =>
    apiClient.post<TaskResponse>('/api/tasks', data),

  /**
   * Update task
   */
  update: (id: string, data: UpdateTaskRequest) =>
    apiClient.patch<TaskResponse>(`/api/tasks/${id}`, data),

  /**
   * Move task (drag & drop)
   */
  move: (id: string, data: MoveTaskRequest) =>
    apiClient.post<TaskResponse>(`/api/tasks/${id}/move`, data),

  /**
   * Delete task
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/tasks/${id}`),
};
