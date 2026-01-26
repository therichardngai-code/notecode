import type { ICliAdapter } from '../adapters/gateways';

export interface PauseSessionInput {
  sessionId: string;
}

export interface PauseSessionOutput {
  sessionId: string;
  success: boolean;
}

export class PauseSessionUseCase {
  private cliAdapter: ICliAdapter;

  constructor(cliAdapter: ICliAdapter) {
    this.cliAdapter = cliAdapter;
  }

  async execute(input: PauseSessionInput): Promise<PauseSessionOutput> {
    // Check if session is running
    const isRunning = await this.cliAdapter.isRunning(input.sessionId);
    if (!isRunning) {
      throw new Error(`Session ${input.sessionId} is not running`);
    }

    // Pause the CLI session via API
    const result = await this.cliAdapter.pause(input.sessionId);

    if (!result.success) {
      throw new Error(result.error || `Failed to pause session ${input.sessionId}`);
    }

    return {
      sessionId: input.sessionId,
      success: result.success,
    };
  }
}
