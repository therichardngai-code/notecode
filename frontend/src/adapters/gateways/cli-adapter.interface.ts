import type { Session, SessionStatus, StartSessionRequest } from '../api/sessions-api';
import type { StartChatRequest, ChatTask } from '../api/projects-api';

// Re-export for convenience
export type { Session, SessionStatus, StartSessionRequest, StartChatRequest, ChatTask };

/**
 * CLI streaming block types
 */
export interface CliBlock {
  type: 'text' | 'code' | 'tool_use' | 'thinking' | 'error';
  content?: string;
  language?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/**
 * CLI stream event for WebSocket messages
 */
export interface CliStreamEvent {
  sessionId: string;
  blocks: CliBlock[];
  timestamp: Date;
}

/**
 * Configuration for CLI adapter operations
 */
export interface CliAdapterConfig {
  onStream?: (event: CliStreamEvent) => void;
  onComplete?: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Session control result
 */
export interface SessionControlResult {
  success: boolean;
  session?: Session;
  error?: string;
}

/**
 * Chat mode result (includes auto-created task)
 */
export interface StartChatResult {
  task: ChatTask;
  session: Session;
  wsUrl: string;
}

/**
 * Task mode result
 */
export interface StartTaskSessionResult {
  session: Session;
  wsUrl?: string;
}

/**
 * CLI Adapter Interface
 * Supports both Chat Mode and Task Mode
 */
export interface ICliAdapter {
  // ============================================
  // CHAT MODE - AI Chat Tab, Floating Chat
  // ============================================

  /** Start chat session (auto-creates ephemeral task) */
  startChat(projectId: string, request: StartChatRequest, config?: CliAdapterConfig): Promise<StartChatResult>;

  // ============================================
  // TASK MODE - Tasks Tab, Add Task, FullTaskDetails
  // ============================================

  /** Start task session (for existing task) */
  startTaskSession(request: StartSessionRequest, config?: CliAdapterConfig): Promise<StartTaskSessionResult>;

  // ============================================
  // SESSION CONTROL - Both modes
  // ============================================

  /** Stop a running session by sessionId */
  stop(sessionId: string): Promise<SessionControlResult>;

  /** Pause a running session by sessionId */
  pause(sessionId: string): Promise<SessionControlResult>;

  /** Resume a paused session by sessionId */
  resume(sessionId: string): Promise<SessionControlResult>;

  /** Check if session is currently running */
  isRunning(sessionId: string): Promise<boolean>;

  /** Get session by ID */
  getSession(sessionId: string): Promise<Session | null>;
}
