/**
 * Hook Executor Service
 * Coordinates hook execution across different runner types
 */

import {
  Hook,
  HookEvent,
  HookConfig,
  ShellHookConfig,
  HttpHookConfig,
  WebSocketHookConfig,
  HookFilterContext,
} from '../entities/hook.entity.js';
import { IHookRepository } from '../ports/repositories/hook.repository.port.js';

// Context passed to hook execution
export interface HookContext {
  event: HookEvent;
  projectId?: string;
  taskId?: string;
  sessionId?: string;
  data: Record<string, unknown>;
}

// Result of a single hook execution
export interface HookResult {
  hookId: string;
  hookName: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

// Interface for hook runners
export interface IHookRunner<T extends HookConfig> {
  run(config: T, context: HookContext): Promise<string>;
}

export class HookExecutorService {
  constructor(
    private hookRepo: IHookRepository,
    private shellRunner: IHookRunner<ShellHookConfig>,
    private httpRunner: IHookRunner<HttpHookConfig>,
    private wsRunner: IHookRunner<WebSocketHookConfig>
  ) {}

  /**
   * Execute all matching hooks for an event
   * Returns array of results, stops early if blocking hook fails
   */
  async execute(context: HookContext): Promise<HookResult[]> {
    // Find all enabled hooks for this event
    const hooks = await this.hookRepo.findByEvent(
      context.event,
      context.projectId,
      context.taskId
    );

    if (hooks.length === 0) {
      return [];
    }

    // Build filter context from hook context
    const filterContext: HookFilterContext = {
      toolName: context.data.toolName as string | undefined,
      status: context.data.status as string | undefined,
      provider: context.data.provider as string | undefined,
    };

    // Filter hooks by their filter conditions
    const matchingHooks = hooks.filter(h => h.matchesFilters(filterContext));

    if (matchingHooks.length === 0) {
      return [];
    }

    // Sort by priority (higher first)
    matchingHooks.sort((a, b) => b.priority - a.priority);

    // Execute hooks
    const results: HookResult[] = [];

    for (const hook of matchingHooks) {
      const result = await this.runHook(hook, context);
      results.push(result);

      // Stop if blocking hook fails
      if (hook.isBlocking() && !result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single hook
   */
  private async runHook(hook: Hook, context: HookContext): Promise<HookResult> {
    const start = Date.now();

    try {
      let output: string;

      switch (hook.type) {
        case 'shell':
          output = await this.shellRunner.run(hook.config as ShellHookConfig, context);
          break;
        case 'http':
          output = await this.httpRunner.run(hook.config as HttpHookConfig, context);
          break;
        case 'websocket':
          output = await this.wsRunner.run(hook.config as WebSocketHookConfig, context);
          break;
        default:
          throw new Error(`Unknown hook type: ${hook.type}`);
      }

      return {
        hookId: hook.id,
        hookName: hook.name,
        success: true,
        output,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        hookId: hook.id,
        hookName: hook.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Test a specific hook with mock context
   */
  async testHook(hookId: string, mockContext?: Partial<HookContext>): Promise<HookResult> {
    const hook = await this.hookRepo.findById(hookId);
    if (!hook) {
      throw new Error(`Hook not found: ${hookId}`);
    }

    const context: HookContext = {
      event: hook.event,
      projectId: hook.projectId ?? undefined,
      taskId: hook.taskId ?? undefined,
      data: mockContext?.data ?? { test: true },
      ...mockContext,
    };

    return this.runHook(hook, context);
  }
}
