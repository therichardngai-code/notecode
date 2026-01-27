/**
 * CLI Executor Port
 * Interface for spawning and managing CLI processes
 */

import { ProviderType } from '../../value-objects/task-status.vo.js';

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

export interface CliSpawnConfig {
  provider: ProviderType;
  model: string;
  workingDir: string;

  // Session management
  sessionId?: string;
  resumeSessionId?: string;
  continueRecent?: boolean;
  forkSession?: boolean;

  // Agent
  agentName?: string;  // Agent name for --agent flag

  // Prompts
  initialPrompt?: string;  // User prompt to execute
  systemPrompt?: string;
  appendSystemPrompt?: string;

  // Tools & Permissions
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: PermissionMode;

  // Budget
  maxBudgetUsd?: number;
  fallbackModel?: string;

  // MCP
  mcpConfig?: string[];

  // Custom subagents (JSON object for --agents flag)
  customAgents?: Record<string, {
    description: string;
    prompt: string;
    tools?: string[];
    model?: string;
  }>;
}

export interface CliProcess {
  processId: number;
  sessionId: string;
}

export type CliOutputType =
  | 'message'
  | 'tool_use'
  | 'tool_result'
  | 'thinking'
  | 'result'
  | 'system';

export interface CliOutput {
  type: CliOutputType;
  content: unknown;
  timestamp: Date;
}

export interface ICliExecutor {
  /**
   * Spawn a new CLI process with the given configuration
   */
  spawn(config: CliSpawnConfig): Promise<CliProcess>;

  /**
   * Send a message to the CLI process stdin
   */
  sendMessage(processId: number, message: string): Promise<void>;

  /**
   * Send an approval response (y/n) to the CLI process
   */
  sendApprovalResponse(processId: number, approved: boolean): Promise<void>;

  /**
   * Terminate a CLI process
   */
  terminate(processId: number): Promise<void>;

  /**
   * Subscribe to CLI output events
   * @returns Unsubscribe function
   */
  onOutput(processId: number, callback: (output: CliOutput) => void): () => void;

  /**
   * Subscribe to CLI process exit events
   * @returns Unsubscribe function
   */
  onExit(processId: number, callback: (code: number) => void): () => void;

  /**
   * Check if a process is still running
   */
  isRunning(processId: number): boolean;
}
