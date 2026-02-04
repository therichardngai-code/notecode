/**
 * CLI Tool Interceptor Service
 * Intercepts CLI tool executions and runs blocking hooks
 * Exit codes: 0=continue, 1=warn, 2=block
 */

import { HookExecutorService, HookContext, HookResult } from '../../domain/services/hook-executor.service.js';

export interface ToolInterceptResult {
  allowed: boolean;
  blocked: boolean;
  warning: string | null;
  blockReason: string | null;
  hookResults: HookResult[];
}

export interface ToolCallContext {
  sessionId: string;
  projectId?: string;
  taskId?: string;
  provider: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  workingDir?: string;
  /** Permission mode from task config (for hooks to check pre-approved tools) */
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  /** Allowed tools from task config (pre-approved by user) */
  allowedTools?: string[];
}

export class CliToolInterceptorService {
  constructor(private hookExecutor: HookExecutorService) {}

  /**
   * Check if a tool call should be allowed
   * Runs tool:before hooks and checks for blocking results
   */
  async checkToolCall(context: ToolCallContext): Promise<ToolInterceptResult> {
    const hookContext: HookContext = {
      event: 'tool:before',
      projectId: context.projectId,
      taskId: context.taskId,
      sessionId: context.sessionId,
      data: {
        toolName: context.toolName,
        toolInput: context.toolInput,
        provider: context.provider,
        workingDir: context.workingDir,
        permissionMode: context.permissionMode ?? 'default',
        allowedTools: context.allowedTools ?? [],
      },
    };

    const results = await this.hookExecutor.execute(hookContext);

    // Check if any blocking hook failed
    const blockingFailure = results.find(r => !r.success && this.isBlockingResult(r));
    const warningFailure = results.find(r => !r.success && !this.isBlockingResult(r));

    if (blockingFailure) {
      return {
        allowed: false,
        blocked: true,
        warning: null,
        blockReason: blockingFailure.error ?? `Blocked by hook: ${blockingFailure.hookName}`,
        hookResults: results,
      };
    }

    return {
      allowed: true,
      blocked: false,
      warning: warningFailure?.error ?? null,
      blockReason: null,
      hookResults: results,
    };
  }

  /**
   * Notify hooks after tool execution
   */
  async notifyToolComplete(
    context: ToolCallContext,
    result: { success: boolean; output?: unknown }
  ): Promise<HookResult[]> {
    const hookContext: HookContext = {
      event: 'tool:after',
      projectId: context.projectId,
      taskId: context.taskId,
      sessionId: context.sessionId,
      data: {
        toolName: context.toolName,
        toolInput: context.toolInput,
        toolResult: result,
        provider: context.provider,
      },
    };

    return this.hookExecutor.execute(hookContext);
  }

  /**
   * Check dangerous patterns in tool input
   * Built-in safety checks before running hooks
   */
  checkDangerousPatterns(
    toolName: string,
    toolInput: Record<string, unknown>
  ): { dangerous: boolean; reason?: string } {
    const dangerousCommands = [
      /rm\s+-rf\s+[\/~]/i,
      /rm\s+-fr\s+[\/~]/i,
      /rmdir\s+\/s\s+\/q/i,
      /del\s+\/s\s+\/q/i,
      /format\s+[a-z]:/i,
      /dd\s+if=.*of=\/dev/i,
      /mkfs\./i,
      /> \/dev\/sd/i,
      /chmod\s+-R\s+777\s+\//i,
      /curl.*\|\s*(ba)?sh/i,
      /wget.*\|\s*(ba)?sh/i,
    ];

    if (toolName === 'Bash' || toolName === 'Shell') {
      const command = String(toolInput.command ?? '');
      for (const pattern of dangerousCommands) {
        if (pattern.test(command)) {
          return {
            dangerous: true,
            reason: `Dangerous command pattern detected: ${pattern.source}`,
          };
        }
      }
    }

    // Check for writes to sensitive paths
    if (toolName === 'Write' || toolName === 'Edit') {
      const filePath = String(toolInput.file_path ?? toolInput.path ?? '');
      const sensitivePaths = ['/etc/', '/boot/', '/sys/', '/proc/', 'C:\\Windows\\System32'];
      for (const sensitive of sensitivePaths) {
        if (filePath.toLowerCase().includes(sensitive.toLowerCase())) {
          return {
            dangerous: true,
            reason: `Attempting to modify sensitive path: ${sensitive}`,
          };
        }
      }
    }

    return { dangerous: false };
  }

  private isBlockingResult(result: HookResult): boolean {
    // Check if error message contains exit code 2 indication
    // or if the hook was marked as blocking
    return result.error?.includes('exit code 2') ||
           result.error?.includes('blocked') ||
           !result.success;
  }
}
