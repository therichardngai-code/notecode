/**
 * WebSocket Hook Runner
 * Sends messages to WebSocket endpoints
 */

import WebSocket from 'ws';
import { WebSocketHookConfig } from '../../domain/entities/hook.entity.js';
import { IHookRunner, HookContext } from '../../domain/services/hook-executor.service.js';

const DEFAULT_TIMEOUT = 5000; // 5 seconds

export class WebSocketHookRunner implements IHookRunner<WebSocketHookConfig> {
  async run(config: WebSocketHookConfig, context: HookContext): Promise<string> {
    // Build message payload
    const payload = {
      channel: config.channel,
      event: context.event,
      projectId: context.projectId,
      taskId: context.taskId,
      sessionId: context.sessionId,
      data: context.data,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(config.url);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          reject(new Error(`WebSocket hook timed out after ${DEFAULT_TIMEOUT}ms`));
        }
      }, DEFAULT_TIMEOUT);

      ws.on('open', () => {
        ws.send(JSON.stringify(payload), (error) => {
          clearTimeout(timeout);
          resolved = true;
          ws.close();

          if (error) {
            reject(new Error(`WebSocket send failed: ${error.message}`));
          } else {
            resolve('Message sent successfully');
          }
        });
      });

      ws.on('error', (error) => {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          reject(new Error(`WebSocket hook failed: ${error.message}`));
        }
      });
    });
  }
}
