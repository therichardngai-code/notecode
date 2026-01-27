/**
 * Shell Hook Runner
 * Executes shell commands with environment variables from hook context
 */

import { spawn } from 'child_process';
import { ShellHookConfig } from '../../domain/entities/hook.entity.js';
import { IHookRunner, HookContext } from '../../domain/services/hook-executor.service.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export class ShellHookRunner implements IHookRunner<ShellHookConfig> {
  async run(config: ShellHookConfig, context: HookContext): Promise<string> {
    const timeout = config.timeout ?? DEFAULT_TIMEOUT;

    // Build environment with hook context
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...config.env,
      HOOK_EVENT: context.event,
      HOOK_PROJECT_ID: context.projectId ?? '',
      HOOK_TASK_ID: context.taskId ?? '',
      HOOK_SESSION_ID: context.sessionId ?? '',
      HOOK_DATA: JSON.stringify(context.data),
    };

    return new Promise((resolve, reject) => {
      const proc = spawn(config.command, {
        shell: true,
        cwd: config.cwd ?? process.cwd(),
        env,
        timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(new Error(`Shell hook failed: ${error.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout || stderr);
        } else {
          reject(new Error(
            `Shell hook exited with code ${code}: ${stderr || stdout}`
          ));
        }
      });

      // Handle timeout
      if (timeout > 0) {
        setTimeout(() => {
          proc.kill('SIGTERM');
          reject(new Error(`Shell hook timed out after ${timeout}ms`));
        }, timeout);
      }
    });
  }
}
