/**
 * Gemini CLI Adapter
 * Implements ICliExecutor for spawning and managing Gemini CLI processes
 */

import { spawn, ChildProcess } from 'child_process';
import {
  ICliExecutor,
  CliSpawnConfig,
  CliProcess,
  CliOutput,
} from '../../domain/ports/gateways/cli-executor.port.js';

export class GeminiCliAdapter implements ICliExecutor {
  private processes = new Map<number, ChildProcess>();
  private outputCallbacks = new Map<number, Set<(output: CliOutput) => void>>();
  private exitCallbacks = new Map<number, Set<(code: number) => void>>();

  /**
   * Resolve backend URL lazily (at spawn time, not construction time).
   * In Electron mode, NOTECODE_PORT is set AFTER server.listen() — so reading
   * env at construction time would capture PORT=0 instead of the actual port.
   */
  private getBackendUrl(): string {
    return process.env.NOTECODE_BACKEND_URL
      ?? `http://localhost:${process.env.NOTECODE_PORT ?? process.env.PORT ?? 41920}`;
  }

  async spawn(config: CliSpawnConfig): Promise<CliProcess> {
    const args = this.buildArgs(config);

    // Resolve backend URL at spawn time for Electron PORT=0 support
    const backendUrl = this.getBackendUrl();

    const proc = spawn('npx', args, {
      cwd: config.workingDir,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NOTECODE_SESSION_ID: config.sessionId ?? '',
        NOTECODE_BACKEND_URL: backendUrl,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    const processId = proc.pid!;
    this.processes.set(processId, proc);
    this.outputCallbacks.set(processId, new Set());
    this.exitCallbacks.set(processId, new Set());

    this.setupOutputParsing(processId, proc);

    proc.on('exit', (code) => {
      const callbacks = this.exitCallbacks.get(processId);
      callbacks?.forEach(cb => cb(code ?? 1));
      this.cleanup(processId);
    });

    const cliProcess = await this.waitForSessionId(processId);

    if (config.initialPrompt) {
      await this.sendMessage(processId, config.initialPrompt);
    }

    return cliProcess;
  }

  private buildArgs(config: CliSpawnConfig): string[] {
    const args: string[] = [
      '@anthropic-ai/gemini-cli', // TODO: Update to actual Gemini CLI package
      '--output-format', 'json',
      '--model', config.model,
    ];

    // Session options
    if (config.resumeSessionId) {
      args.push('--session', config.resumeSessionId);
    }

    // Prompts
    if (config.systemPrompt) {
      args.push('--system-prompt', config.systemPrompt);
    }

    // Tools - Gemini uses different tool names
    if (config.allowedTools?.length) {
      const geminiTools = config.allowedTools.map(t => this.mapToolName(t));
      args.push('--tools', geminiTools.join(','));
    }

    return args;
  }

  private setupOutputParsing(processId: number, proc: ChildProcess): void {
    let buffer = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const output = this.normalizeOutput(parsed);
          this.notifyOutputListeners(processId, output);
        } catch {
          this.notifyOutputListeners(processId, {
            type: 'system',
            content: line,
            timestamp: new Date(),
          });
        }
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      this.notifyOutputListeners(processId, {
        type: 'system',
        content: chunk.toString(),
        timestamp: new Date(),
      });
    });
  }

  private waitForSessionId(processId: number): Promise<CliProcess> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const fallbackTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const generatedSessionId = `gemini-${processId}-${Date.now()}`;
          resolve({ processId, sessionId: generatedSessionId });
        }
      }, 5000);

      const timeout = setTimeout(() => {
        if (!resolved) {
          reject(new Error('Timeout waiting for session ID'));
        }
      }, 30000);

      const handler = (output: CliOutput) => {
        const content = output.content as Record<string, unknown> | undefined;
        const sessionId = content?.session_id as string ?? content?.session as string;

        if (sessionId && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          clearTimeout(fallbackTimeout);
          this.outputCallbacks.get(processId)?.delete(handler);
          resolve({ processId, sessionId });
        }
      };

      this.outputCallbacks.get(processId)?.add(handler);
    });
  }

  async sendMessage(processId: number, message: string): Promise<void> {
    const proc = this.processes.get(processId);
    if (!proc?.stdin?.writable) {
      throw new Error('Process not found or stdin not writable');
    }
    proc.stdin.write(message + '\n');
  }

  async sendApprovalResponse(processId: number, approved: boolean): Promise<void> {
    const proc = this.processes.get(processId);
    if (!proc?.stdin?.writable) {
      throw new Error('Process not found');
    }
    proc.stdin.write(approved ? 'y\n' : 'n\n');
  }

  async terminate(processId: number): Promise<void> {
    const proc = this.processes.get(processId);
    if (proc) {
      proc.kill('SIGTERM');
      this.cleanup(processId);
    }
  }

  onOutput(processId: number, callback: (output: CliOutput) => void): () => void {
    const callbacks = this.outputCallbacks.get(processId);
    if (!callbacks) throw new Error('Process not found');
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }

  onExit(processId: number, callback: (code: number) => void): () => void {
    const callbacks = this.exitCallbacks.get(processId);
    if (!callbacks) throw new Error('Process not found');
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }

  isRunning(processId: number): boolean {
    const proc = this.processes.get(processId);
    return proc !== undefined && !proc.killed;
  }

  private notifyOutputListeners(processId: number, output: CliOutput): void {
    const callbacks = this.outputCallbacks.get(processId);
    callbacks?.forEach(cb => cb(output));
  }

  private cleanup(processId: number): void {
    this.processes.delete(processId);
    this.outputCallbacks.delete(processId);
    this.exitCallbacks.delete(processId);
  }

  private normalizeOutput(parsed: unknown): CliOutput {
    const obj = parsed as Record<string, unknown>;
    const timestamp = new Date();

    // Normalize Gemini output format to common format
    const type = obj.type as string;

    if (type === 'model_response') {
      return { type: 'message', content: obj.content, timestamp };
    }
    if (type === 'tool_call') {
      return { type: 'tool_use', content: obj, timestamp };
    }
    if (type === 'tool_response') {
      return { type: 'tool_result', content: obj, timestamp };
    }
    return { type: 'system', content: obj, timestamp };
  }

  /**
   * Map Claude tool names to Gemini equivalents
   */
  private mapToolName(claudeTool: string): string {
    const mapping: Record<string, string> = {
      'Read': 'ReadFile',
      'Write': 'WriteFile',
      'Edit': 'EditFile',
      'Bash': 'Shell',
      'Glob': 'ListFiles',
      'Grep': 'SearchFiles',
    };
    return mapping[claudeTool] ?? claudeTool;
  }
}
