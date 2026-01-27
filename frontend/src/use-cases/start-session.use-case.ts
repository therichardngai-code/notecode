import type { ISessionRepository } from '../domain/ports/repositories';
import type { ICliAdapter, CliStreamEvent } from '../adapters/gateways';
import type { Session, SessionResumeMode } from '../adapters/api/sessions-api';

export interface StartSessionInput {
  taskId: string;
  mode?: SessionResumeMode;  // 'renew' | 'retry' | 'fork'
  agentId?: string;
  initialPrompt?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  maxBudgetUsd?: number;
}

export interface StartSessionOutput {
  session: Session;
}

export class StartSessionUseCase {
  private sessionRepository: ISessionRepository;
  private cliAdapter: ICliAdapter;

  constructor(
    sessionRepository: ISessionRepository,
    cliAdapter: ICliAdapter
  ) {
    this.sessionRepository = sessionRepository;
    this.cliAdapter = cliAdapter;
  }

  async execute(input: StartSessionInput): Promise<StartSessionOutput> {
    // Start CLI session via API (Task Mode)
    const { session } = await this.cliAdapter.startTaskSession(
      {
        taskId: input.taskId,
        mode: input.mode,
        agentId: input.agentId,
        initialPrompt: input.initialPrompt,
        permissionMode: input.permissionMode,
        maxBudgetUsd: input.maxBudgetUsd,
      },
      {
        onStream: (event: CliStreamEvent) => {
          console.log('Stream event:', event);
        },
        onComplete: async (sessionId: string) => {
          await this.sessionRepository.updateStatus(sessionId, 'completed');
        },
        onError: async (error: Error) => {
          console.error('Session error:', error);
          await this.sessionRepository.updateStatus(session.id, 'failed');
        },
      }
    );

    return { session };
  }
}
