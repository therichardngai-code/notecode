/**
 * Pause Session Use Case
 * Pauses a running session (terminates CLI, allows resume later)
 */

import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ICliExecutor } from '../../domain/ports/gateways/cli-executor.port.js';
import { SessionStatus } from '../../domain/value-objects/task-status.vo.js';

export interface PauseSessionResult {
  success: boolean;
  error?: string;
}

export class PauseSessionUseCase {
  constructor(
    private sessionRepo: ISessionRepository,
    private cliExecutor: ICliExecutor
  ) {}

  async execute(sessionId: string): Promise<PauseSessionResult> {
    // 1. Find session
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // 2. Validate session can be paused
    if (session.status !== SessionStatus.RUNNING) {
      return { success: false, error: 'Session is not running' };
    }

    // 3. Terminate CLI process
    // Note: Claude CLI doesn't have a pause command
    // We stop the process and later resume with --resume flag
    if (session.processId) {
      try {
        await this.cliExecutor.terminate(session.processId);
      } catch (error) {
        console.error('Error terminating process:', error);
        // Continue with status update even if terminate fails
      }
    }

    // 4. Update session status
    session.pause();
    await this.sessionRepo.save(session);

    return { success: true };
  }
}
