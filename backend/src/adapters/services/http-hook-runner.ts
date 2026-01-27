/**
 * HTTP Hook Runner
 * Sends HTTP requests (webhooks) with hook context as payload
 */

import { HttpHookConfig } from '../../domain/entities/hook.entity.js';
import { IHookRunner, HookContext } from '../../domain/services/hook-executor.service.js';

const DEFAULT_TIMEOUT = 10000; // 10 seconds

export class HttpHookRunner implements IHookRunner<HttpHookConfig> {
  async run(config: HttpHookConfig, context: HookContext): Promise<string> {
    const timeout = config.timeout ?? DEFAULT_TIMEOUT;
    const method = config.method ?? 'POST';

    // Build payload
    const payload = {
      event: context.event,
      projectId: context.projectId,
      taskId: context.taskId,
      sessionId: context.sessionId,
      data: context.data,
      timestamp: new Date().toISOString(),
    };

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NoteCode-Hooks/1.0',
      ...config.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(config.url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      return responseText || `HTTP ${response.status} OK`;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`HTTP hook timed out after ${timeout}ms`);
        }
        throw new Error(`HTTP hook failed: ${error.message}`);
      }
      throw error;
    }
  }
}
