import { sessionsApi, type Session } from '../api/sessions-api';
import { projectsApi } from '../api/projects-api';
import type {
  ICliAdapter,
  CliAdapterConfig,
  SessionControlResult,
  StartChatResult,
  StartTaskSessionResult,
  StartSessionRequest,
  StartChatRequest,
} from './cli-adapter.interface';

/**
 * Gemini CLI Adapter
 * Wraps sessionsApi and projectsApi to provide ICliAdapter interface.
 * Supports both Chat Mode and Task Mode.
 */
export class GeminiCliAdapter implements ICliAdapter {
  private streamConfigs = new Map<string, CliAdapterConfig>();

  // ============================================
  // CHAT MODE - AI Chat Tab, Floating Chat
  // ============================================

  async startChat(projectId: string, request: StartChatRequest, config?: CliAdapterConfig): Promise<StartChatResult> {
    const response = await projectsApi.startChat(projectId, request);

    if (config && response.session) {
      this.streamConfigs.set(response.session.id, config);
    }

    return response;
  }

  // ============================================
  // TASK MODE - Tasks Tab, Add Task, FullTaskDetails
  // ============================================

  async startTaskSession(request: StartSessionRequest, config?: CliAdapterConfig): Promise<StartTaskSessionResult> {
    const response = await sessionsApi.start(request);

    if (config && response.session) {
      this.streamConfigs.set(response.session.id, config);
    }

    return { session: response.session, wsUrl: response.wsUrl };
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
}
