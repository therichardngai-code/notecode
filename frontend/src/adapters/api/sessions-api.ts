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

// Session resume modes
export type SessionResumeMode = 'renew' | 'retry' | 'fork';

// Context window usage tracking
export interface ContextWindowUsage {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalContextTokens: number;
  contextSize: number;
  contextPercent: number;
  provider: ProviderType;
  timestamp: string;
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
  // Attempt tracking fields - optional until backend supports
  resumeMode?: SessionResumeMode | null;  // null = first attempt
  attemptNumber?: number;  // defaults to 1
  resumedFromSessionId?: string | null;  // Source session ID (for retry/fork)
  contextWindow?: ContextWindowUsage | null;  // Context window tracking
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

export interface DiffHunk {
  header: string;
  lines: { type: 'add' | 'remove' | 'context'; lineNum: number; content: string }[];
}

export interface Diff {
  id: string;
  sessionId: string;
  messageId: string | null;
  toolUseId: string;
  approvalId: string | null;
  filePath: string;
  operation: 'edit' | 'write' | 'delete';
  oldContent: string | null;
  newContent: string | null;
  hunks: DiffHunk[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt: string;
}

export interface StartSessionRequest {
  taskId: string;
  mode?: SessionResumeMode;  // 'renew' | 'retry' | 'fork', default: auto (null for first attempt)
  agentId?: string;
  initialPrompt?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  maxBudgetUsd?: number;
  model?: string;  // e.g., 'claude-3-5-sonnet-latest'
  provider?: string;  // e.g., 'anthropic', 'google', 'openai'
  files?: string[];  // attached file paths
  disableWebTools?: boolean;  // true = disable web search
  tools?: { mode: 'allowlist' | 'blocklist'; tools: string[] };
  skills?: string[];
  contextFiles?: string[];
  subagentDelegates?: boolean;
  autoBranch?: boolean;
  autoCommit?: boolean;
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

interface DiffsResponse {
  diffs: Diff[];
}

// Approval types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';
export type ToolCategory = 'safe' | 'requires-approval' | 'dangerous';

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  type: 'tool' | 'diff';
  payload: {
    toolName: string;
    toolInput: {
      file_path?: string;
      command?: string;
      content?: string;
      old_string?: string;
      new_string?: string;
      [key: string]: unknown;
    };
  };
  toolCategory: ToolCategory;
  status: ApprovalStatus;
  timeoutAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  createdAt: string;
}

interface ApprovalsResponse {
  approvals: ApprovalRequest[];
}

interface ApprovalResponse {
  approval: ApprovalRequest;
  diffs?: Diff[];
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

  /**
   * Get session diffs (file changes)
   */
  getDiffs: (sessionId: string) =>
    apiClient.get<DiffsResponse>(`/api/diffs/session/${sessionId}`),

  /**
   * Get pending approvals for session
   */
  getPendingApprovals: (sessionId: string) =>
    apiClient.get<ApprovalsResponse>(`/api/approvals/session/${sessionId}/pending`),

  /**
   * Get single approval by ID
   */
  getApproval: (approvalId: string) =>
    apiClient.get<ApprovalResponse>(`/api/approvals/${approvalId}`),

  /**
   * Approve tool execution
   */
  approveRequest: (approvalId: string) =>
    apiClient.post<{ success: boolean }>(`/api/approvals/${approvalId}/approve`, { decidedBy: 'user' }),

  /**
   * Reject tool execution
   */
  rejectRequest: (approvalId: string) =>
    apiClient.post<{ success: boolean }>(`/api/approvals/${approvalId}/reject`, { decidedBy: 'user' }),
};

/**
 * WebSocket URL builder for session streaming
 */
export function getSessionWebSocketUrl(sessionId: string): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const apiHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:3001';
  return `${wsProtocol}//${apiHost}/ws/session/${sessionId}`;
}
