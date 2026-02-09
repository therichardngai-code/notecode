/**
 * Claude CLI Adapter
 * Implements ICliExecutor for spawning and managing Claude Code CLI processes
 */

import { spawn, ChildProcess } from 'child_process';
import {
  ICliExecutor,
  CliSpawnConfig,
  CliProcess,
  CliOutput,
} from '../../domain/ports/gateways/cli-executor.port.js';

export class ClaudeCliAdapter implements ICliExecutor {
  private processes = new Map<number, ChildProcess>();
  private outputCallbacks = new Map<number, Set<(output: CliOutput) => void>>();
  private exitCallbacks = new Map<number, Set<(code: number) => void>>();
  // Map internal sessionId → CLI's providerSessionId (captured async)
  private cliSessionIds = new Map<string, string>();
  // Callbacks for when CLI session ID is captured
  private sessionIdCallbacks = new Map<string, (cliSessionId: string) => void>();

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
    // debugLog('[ClaudeCliAdapter] Spawning with args:', args.slice(0, 5).join(' '), '...');
    // debugLog('[ClaudeCliAdapter] Working dir:', config.workingDir);

    // Resolve backend URL at spawn time (not construction time) for Electron PORT=0 support
    const backendUrl = this.getBackendUrl();

    // Pass session ID and backend URL to hooks via environment
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
      windowsHide: true,
    });

    // Debug: check stdin state
    // debugLog('[ClaudeCliAdapter] stdin writable:', proc.stdin?.writable, 'destroyed:', proc.stdin?.destroyed);

    const processId = proc.pid!;
    // debugLog('[ClaudeCliAdapter] Process spawned with PID:', processId);
    this.processes.set(processId, proc);
    this.outputCallbacks.set(processId, new Set());
    this.exitCallbacks.set(processId, new Set());

    // Set up output parsing
    this.setupOutputParsing(processId, proc);

    // Track if spawn is complete to avoid premature cleanup
    let spawnComplete = false;

    // Set up exit handler
    proc.on('exit', (code) => {
      // debugLog('[ClaudeCliAdapter] Process exited with code:', code, 'spawnComplete:', spawnComplete);
      const callbacks = this.exitCallbacks.get(processId);
      callbacks?.forEach(cb => cb(code ?? 1));
      // Only cleanup if spawn is complete, otherwise let spawn handle the error
      if (spawnComplete) {
        this.cleanup(processId);
      }
    });

    // Handle spawn errors - trigger exit callbacks to update session status in DB
    proc.on('error', (err) => {
      console.error('[ClaudeCliAdapter] Spawn error:', err.message);
      // Trigger exit callbacks with error code to ensure session status is updated
      // This prevents stale session states when spawn fails before exit handlers are set up
      const callbacks = this.exitCallbacks.get(processId);
      callbacks?.forEach(cb => cb(1)); // Exit code 1 indicates failure
      this.cleanup(processId);
    });

    // Capture stderr for debugging
    let stderrBuffer = '';
    proc.stderr?.on('data', (data) => {
      stderrBuffer += data.toString();
      console.error('[ClaudeCliAdapter] stderr:', data.toString().trim());
    });

    // Always use internal session ID (DB session ID) for tracking
    // resumeSessionId is ONLY for the CLI's --resume flag (used in buildArgs)
    const internalSessionId = config.sessionId ?? `cli-${processId}-${Date.now()}`;

    // Set up async listener to capture CLI's session_id for future resume
    this.setupSessionIdCapture(processId, internalSessionId);

    // Send initial prompt via stdin if provided
    if (config.initialPrompt) {
      await this.sendMessage(processId, config.initialPrompt);
    }

    spawnComplete = true;
    return { processId, sessionId: internalSessionId };
  }

  private buildArgs(config: CliSpawnConfig): string[] {
    const args: string[] = [
      '@anthropic-ai/claude-code',
      '--print',
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',  // Enable real-time text streaming
      '--model', config.model,
    ];

    // Session options (--session-id not allowed with --resume)
    if (config.resumeSessionId) {
      args.push('--resume', config.resumeSessionId);
    } else if (config.sessionId) {
      args.push('--session-id', config.sessionId);
    }
    if (config.continueRecent) {
      args.push('--continue');
    }
    if (config.forkSession) {
      args.push('--fork-session');
    }

    // Agent
    if (config.agentName) {
      args.push('--agent', config.agentName);
    }

    // Prompts
    if (config.systemPrompt) {
      args.push('--system-prompt', config.systemPrompt);
    }
    if (config.appendSystemPrompt) {
      args.push('--append-system-prompt', config.appendSystemPrompt);
    }

    // Tools & Permissions (space-separated in single quoted string)
    if (config.allowedTools?.length) {
      args.push('--allowedTools', `"${config.allowedTools.join(' ')}"`);
    }
    // Build disallowed tools list
    const disallowedTools = config.disallowedTools ? [...config.disallowedTools] : [];
    if (config.disableWebTools) {
      // Add web tools to blocklist
      if (!disallowedTools.includes('WebSearch')) disallowedTools.push('WebSearch');
      if (!disallowedTools.includes('WebFetch')) disallowedTools.push('WebFetch');
    }
    if (disallowedTools.length) {
      args.push('--disallowedTools', `"${disallowedTools.join(' ')}"`);
    }
    if (config.permissionMode) {
      args.push('--permission-mode', config.permissionMode);
    }

    // Context files
    if (config.files?.length) {
      for (const file of config.files) {
        args.push('--add-dir', file);  // Claude CLI uses --add-dir for context files
      }
    }

    // Budget
    if (config.maxBudgetUsd !== undefined) {
      args.push('--max-budget-usd', config.maxBudgetUsd.toString());
    }
    if (config.fallbackModel) {
      args.push('--fallback-model', config.fallbackModel);
    }

    // MCP
    if (config.mcpConfig?.length) {
      for (const configPath of config.mcpConfig) {
        args.push('--mcp-config', configPath);
      }
    }

    // Note: initialPrompt is sent via stdin after spawn, not as CLI argument
    // because --input-format stream-json expects stdin input

    return args;
  }

  private setupOutputParsing(processId: number, proc: ChildProcess): void {
    let buffer = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      // debugLog('[ClaudeCliAdapter] STDOUT:', data.slice(0, 300));
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const output = this.normalizeOutput(parsed);
          this.notifyOutputListeners(processId, output);
        } catch {
          // Non-JSON output, treat as system message
          this.notifyOutputListeners(processId, {
            type: 'system',
            content: line,
            timestamp: new Date(),
          });
        }
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      const content = chunk.toString();
      // debugLog('[ClaudeCliAdapter] STDERR:', content.slice(0, 500));
      this.notifyOutputListeners(processId, {
        type: 'system',
        content,
        timestamp: new Date(),
      });
    });
  }

  async sendMessage(processId: number, message: string): Promise<void> {
    // debugLog('[ClaudeCliAdapter] sendMessage called for PID:', processId);
    const proc = this.processes.get(processId);
    // debugLog('[ClaudeCliAdapter] proc found:', !!proc, 'stdin writable:', proc?.stdin?.writable);
    if (!proc?.stdin?.writable) {
      // debugLog('[ClaudeCliAdapter] ERROR: ERROR: Process not found or stdin not writable');
      throw new Error('Process not found or stdin not writable');
    }
    // Format per Claude CLI --input-format stream-json spec
    const input = {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: message }],
      },
    };
    proc.stdin.write(JSON.stringify(input) + '\n');
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
    if (!callbacks) {
      throw new Error('Process not found');
    }
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }

  onExit(processId: number, callback: (code: number) => void): () => void {
    const callbacks = this.exitCallbacks.get(processId);
    if (!callbacks) {
      throw new Error('Process not found');
    }
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

  /**
   * Set up async listener to capture CLI's session_id when it arrives
   * This allows API to return immediately without waiting for CLI startup
   */
  private setupSessionIdCapture(processId: number, internalSessionId: string): void {
    let captured = false;
    const handler = (output: CliOutput) => {
      if (captured) return;

      const content = output.content as Record<string, unknown> | undefined;
      const cliSessionId = content?.session_id as string
        ?? content?.session as string
        ?? (content as { message?: { session_id?: string } })?.message?.session_id;

      if (cliSessionId) {
        captured = true;
        this.cliSessionIds.set(internalSessionId, cliSessionId);
        console.log(`[ClaudeCliAdapter] Captured CLI session ID: ${cliSessionId} for internal: ${internalSessionId.slice(0, 8)}`);

        // Notify callback if registered
        const callback = this.sessionIdCallbacks.get(internalSessionId);
        if (callback) {
          callback(cliSessionId);
          this.sessionIdCallbacks.delete(internalSessionId);
        }

        // Remove this handler after capturing
        this.outputCallbacks.get(processId)?.delete(handler);
      }
    };

    this.outputCallbacks.get(processId)?.add(handler);
  }

  /**
   * Get CLI's session ID for an internal session (for resume)
   */
  getCliSessionId(internalSessionId: string): string | undefined {
    return this.cliSessionIds.get(internalSessionId);
  }

  /**
   * Register callback for when CLI session ID is captured
   */
  onCliSessionIdCaptured(internalSessionId: string, callback: (cliSessionId: string) => void): void {
    // Check if already captured
    const existing = this.cliSessionIds.get(internalSessionId);
    if (existing) {
      callback(existing);
      return;
    }
    this.sessionIdCallbacks.set(internalSessionId, callback);
  }

  private normalizeOutput(parsed: unknown): CliOutput {
    const obj = parsed as Record<string, unknown>;
    const timestamp = new Date();

    // Map Claude CLI output types to our types
    const type = obj.type as string;

    switch (type) {
      case 'assistant':
        return { type: 'message', content: obj.message ?? obj, timestamp };
      case 'tool_use':
        return { type: 'tool_use', content: obj, timestamp };
      case 'tool_result':
        return { type: 'tool_result', content: obj, timestamp };
      case 'thinking':
        return { type: 'thinking', content: obj, timestamp };
      case 'result':
        return { type: 'result', content: obj, timestamp };
      case 'stream_event':
        // Real-time streaming events from --include-partial-messages
        // Contains event.type: content_block_delta with event.delta.text
        return { type: 'stream_event', content: obj, timestamp };
      default:
        return { type: 'system', content: obj, timestamp };
    }
  }
}
