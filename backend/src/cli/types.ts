/**
 * CLI Type Definitions
 * Shared types for the NoteCode CLI
 */

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus = 'not-started' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'archived';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  total: number;
  estimatedCostUsd: number;
}

export interface Session {
  id: string;
  taskId: string | null;
  status: SessionStatus;
  provider: string | null;
  processId: number | null;
  workingDir: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  tokenUsage: TokenUsage;
}

// ============================================================================
// Approval Types
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

export interface ApprovalPayload {
  type: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
}

export interface Approval {
  id: string;
  sessionId: string;
  type: string;
  payload: ApprovalPayload;
  toolCategory: string;
  status: ApprovalStatus;
  timeoutAt: string;
  autoAction: string;
  decidedAt: string | null;
  decidedBy: string | null;
  createdAt: string;
}

// ============================================================================
// Hook Types
// ============================================================================

export type CliProvider = 'claude' | 'gemini' | 'codex';
export type HookScope = 'project' | 'global';

export interface CliHook {
  id: string;
  projectId: string | null;
  provider: CliProvider;
  name: string;
  hookType: string;
  script: string;
  enabled: boolean;
  scope: HookScope;
  matcher?: string;
  timeout?: number;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  provider: string;
  model: string;
  skills: string[];
}

// ============================================================================
// CLI Options
// ============================================================================

export interface GlobalOptions {
  apiUrl: string;
  json?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface TaskListResponse {
  tasks: Task[];
}

export interface SessionListResponse {
  sessions: Session[];
}

export interface ApprovalListResponse {
  approvals: Approval[];
}

export interface HookListResponse {
  hooks: CliHook[];
  total: number;
}

export interface ProjectListResponse {
  projects: Project[];
}
