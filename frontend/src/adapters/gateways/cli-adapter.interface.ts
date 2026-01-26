import type { Session, SessionStatus, StartSessionRequest } from '../api/sessions-api';

// Re-export for convenience
export type { Session, SessionStatus, StartSessionRequest };

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
 * CLI Adapter Interface
 * Aligned with backend session-based API (uses sessionId: string, not processId: number)
 */
export interface ICliAdapter {
  /** Start a new session - returns session with wsUrl for streaming */
  start(request: StartSessionRequest, config?: CliAdapterConfig): Promise<Session>;

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
