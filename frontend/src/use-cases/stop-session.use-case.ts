import type { ICliAdapter } from '../adapters/gateways';

export interface StopSessionInput {
  sessionId: string;
}

export interface StopSessionOutput {
  sessionId: string;
  success: boolean;
}

export class StopSessionUseCase {
  private cliAdapter: ICliAdapter;

  constructor(cliAdapter: ICliAdapter) {
    this.cliAdapter = cliAdapter;
  }

  async execute(input: StopSessionInput): Promise<StopSessionOutput> {
    // Check if session is running
    const isRunning = await this.cliAdapter.isRunning(input.sessionId);
    if (!isRunning) {
      throw new Error(`Session ${input.sessionId} is not running`);
    }

    // Stop the CLI session via API
    const result = await this.cliAdapter.stop(input.sessionId);

    if (!result.success) {
      throw new Error(result.error || `Failed to stop session ${input.sessionId}`);
    }

    return {
      sessionId: input.sessionId,
      success: result.success,
    };
  }
}
