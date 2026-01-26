import type { ISessionRepository } from '../domain/ports/repositories';
import type { ICliAdapter, CliStreamEvent } from '../adapters/gateways';
import type { Session } from '../adapters/api/sessions-api';

export interface StartSessionInput {
  taskId: string;
  agentId?: string;
  initialPrompt?: string;
  resumeSessionId?: string;
  forkSession?: boolean;
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
    // Start CLI session via API
    const session = await this.cliAdapter.start(
      {
        taskId: input.taskId,
        agentId: input.agentId,
        initialPrompt: input.initialPrompt,
        resumeSessionId: input.resumeSessionId,
        forkSession: input.forkSession,
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
