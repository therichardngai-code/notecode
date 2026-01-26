/**
 * Sessions API
 * HTTP client for session endpoints
 */

import { apiClient } from './api-client';
import type { ProviderType } from './tasks-api';

// Session status type
export type SessionStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolStats {
  [toolName: string]: {
    count: number;
    totalDuration: number;
  };
}

export interface Session {
  id: string;
  taskId: string;
  agentId: string | null;
  providerSessionId: string | null;
  name: string;
  status: SessionStatus;
  provider: ProviderType | null;
  processId: number | null;
  workingDir: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  tokenInput: number;
  tokenOutput: number;
  tokenCacheRead: number;
  tokenCacheCreation: number;
  tokenTotal: number;
  estimatedCostUsd: number;
  modelUsage: ModelUsage[] | null;
  toolStats: ToolStats | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  blocks: unknown[]; // Block types from backend
  timestamp: string;
  tokenCount: number | null;
  toolName: string | null;
  toolInput: unknown | null;
  toolResult: string | null;
}

export interface StartSessionRequest {
  taskId: string;
  agentId?: string;
  initialPrompt?: string;
  resumeSessionId?: string;
  forkSession?: boolean;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  maxBudgetUsd?: number;
}

// API Response types
interface SessionsResponse {
  sessions: Session[];
}

interface SessionResponse {
  session: Session;
  wsUrl?: string;
}

interface MessagesResponse {
  messages: Message[];
}

/**
 * Sessions API methods
 */
export const sessionsApi = {
  /**
   * List sessions with optional task filter
   */
  list: (params?: { taskId?: string; limit?: number }) =>
    apiClient.get<SessionsResponse>('/api/sessions', params),

  /**
   * Get running sessions
   */
  getRunning: () =>
    apiClient.get<SessionsResponse>('/api/sessions/running'),

  /**
   * Get single session by ID
   */
  getById: (id: string) =>
    apiClient.get<SessionResponse>(`/api/sessions/${id}`),

  /**
   * Start new session (spawns CLI)
   */
  start: (data: StartSessionRequest) =>
    apiClient.post<SessionResponse>('/api/sessions', data),

  /**
   * Pause session
   */
  pause: (id: string) =>
    apiClient.post<{ success: boolean }>(`/api/sessions/${id}/pause`),

  /**
   * Resume session
   */
  resume: (id: string) =>
    apiClient.post<SessionResponse>(`/api/sessions/${id}/resume`),

  /**
   * Stop session
   */
  stop: (id: string) =>
    apiClient.post<{ success: boolean }>(`/api/sessions/${id}/stop`),

  /**
   * Get session messages
   */
  getMessages: (id: string, limit = 50) =>
    apiClient.get<MessagesResponse>(`/api/sessions/${id}/messages`, { limit }),

  /**
   * Delete session
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/sessions/${id}`),
};

/**
 * WebSocket URL builder for session streaming
 */
export function getSessionWebSocketUrl(sessionId: string): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const apiHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:3001';
  return `${wsProtocol}//${apiHost}/ws/session/${sessionId}`;
}
