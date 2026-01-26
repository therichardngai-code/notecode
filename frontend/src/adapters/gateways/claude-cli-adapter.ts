import { sessionsApi, type Session, type StartSessionRequest } from '../api/sessions-api';
import type { ICliAdapter, CliAdapterConfig, SessionControlResult } from './cli-adapter.interface';

/**
 * Claude CLI Adapter
 * Wraps sessionsApi to provide ICliAdapter interface for session management.
 * Backend handles actual CLI process spawning via HTTP API.
 */
export class ClaudeCliAdapter implements ICliAdapter {
  private streamConfigs = new Map<string, CliAdapterConfig>();

  async start(request: StartSessionRequest, config?: CliAdapterConfig): Promise<Session> {
    const response = await sessionsApi.start(request);

    if (config && response.session) {
      this.streamConfigs.set(response.session.id, config);
    }

    return response.session;
  }

  async stop(sessionId: string): Promise<SessionControlResult> {
    const response = await sessionsApi.stop(sessionId);
    this.streamConfigs.delete(sessionId);
    return { success: response.success };
  }

  async pause(sessionId: string): Promise<SessionControlResult> {
    const response = await sessionsApi.pause(sessionId);
    return { success: response.success };
  }

  async resume(sessionId: string): Promise<SessionControlResult> {
    const response = await sessionsApi.resume(sessionId);
    return { success: true, session: response.session };
  }

  async isRunning(sessionId: string): Promise<boolean> {
    try {
      const response = await sessionsApi.getById(sessionId);
      return response.session?.status === 'running';
    } catch {
      return false;
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const response = await sessionsApi.getById(sessionId);
      return response.session ?? null;
    } catch {
      return null;
    }
  }

  /** Get stored stream config for a session */
  getStreamConfig(sessionId: string): CliAdapterConfig | undefined {
    return this.streamConfigs.get(sessionId);
  }

  /** Clear stream config when session ends */
  clearStreamConfig(sessionId: string): void {
    this.streamConfigs.delete(sessionId);
  }
}
