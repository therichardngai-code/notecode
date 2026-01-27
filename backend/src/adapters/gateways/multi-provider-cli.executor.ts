/**
 * Multi-Provider CLI Executor
 * Routes CLI operations to the appropriate provider adapter (Claude, Gemini, etc.)
 */

import {
  ICliExecutor,
  CliSpawnConfig,
  CliProcess,
  CliOutput,
} from '../../domain/ports/gateways/cli-executor.port.js';
import { ProviderType } from '../../domain/value-objects/task-status.vo.js';
import { ClaudeCliAdapter } from './claude-cli.adapter.js';
import { GeminiCliAdapter } from './gemini-cli.adapter.js';

export class MultiProviderCliExecutor implements ICliExecutor {
  private adapters: Record<ProviderType, ICliExecutor>;
  private processOwners = new Map<number, ProviderType>();

  constructor(claude?: ClaudeCliAdapter, gemini?: GeminiCliAdapter) {
    this.adapters = {
      [ProviderType.ANTHROPIC]: claude ?? new ClaudeCliAdapter(),
      [ProviderType.GOOGLE]: gemini ?? new GeminiCliAdapter(),
      [ProviderType.OPENAI]: gemini ?? new GeminiCliAdapter(), // Placeholder until Codex adapter
    };
  }

  async spawn(config: CliSpawnConfig): Promise<CliProcess> {
    const adapter = this.adapters[config.provider];
    if (!adapter) {
      throw new Error(`No adapter for provider: ${config.provider}`);
    }

    const process = await adapter.spawn(config);
    this.processOwners.set(process.processId, config.provider);
    return process;
  }

  async sendMessage(processId: number, message: string): Promise<void> {
    const adapter = this.getAdapterForProcess(processId);
    await adapter.sendMessage(processId, message);
  }

  async sendApprovalResponse(processId: number, approved: boolean): Promise<void> {
    const adapter = this.getAdapterForProcess(processId);
    await adapter.sendApprovalResponse(processId, approved);
  }

  async terminate(processId: number): Promise<void> {
    const adapter = this.getAdapterForProcess(processId);
    await adapter.terminate(processId);
    this.processOwners.delete(processId);
  }

  onOutput(processId: number, callback: (output: CliOutput) => void): () => void {
    const adapter = this.getAdapterForProcess(processId);
    return adapter.onOutput(processId, callback);
  }

  onExit(processId: number, callback: (code: number) => void): () => void {
    const adapter = this.getAdapterForProcess(processId);
    return adapter.onExit(processId, callback);
  }

  isRunning(processId: number): boolean {
    try {
      const adapter = this.getAdapterForProcess(processId);
      return adapter.isRunning(processId);
    } catch {
      return false;
    }
  }

  private getAdapterForProcess(processId: number): ICliExecutor {
    const provider = this.processOwners.get(processId);
    if (!provider) {
      throw new Error(`Unknown process: ${processId}`);
    }
    return this.adapters[provider];
  }
}
