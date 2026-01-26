/**
 * Stop Session Use Case
 * Terminates a running session and updates status
 */

import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { ICliExecutor } from '../../domain/ports/gateways/cli-executor.port.js';
import { IEventBus, SessionCompletedEvent } from '../../domain/events/event-bus.js';
import { SessionStatus } from '../../domain/value-objects/task-status.vo.js';

export interface StopSessionResult {
  success: boolean;
  error?: string;
}

export class StopSessionUseCase {
  constructor(
    private sessionRepo: ISessionRepository,
    private cliExecutor: ICliExecutor,
    private eventBus: IEventBus
  ) {}

  async execute(sessionId: string): Promise<StopSessionResult> {
    // 1. Find session
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // 2. Validate session can be stopped
    if (session.status !== SessionStatus.RUNNING && session.status !== SessionStatus.PAUSED) {
      return { success: false, error: 'Session is not running or paused' };
    }

    // 3. Terminate CLI process if running
    if (session.processId) {
      try {
        await this.cliExecutor.terminate(session.processId);
      } catch (error) {
        console.error('Error terminating process:', error);
        // Continue with status update even if terminate fails
      }
    }

    // 4. Update session status
    session.cancel();
    await this.sessionRepo.save(session);

    // 5. Publish event
    this.eventBus.publish([
      new SessionCompletedEvent(session.id, session.tokenUsage)
    ]);

    return { success: true };
  }
}
