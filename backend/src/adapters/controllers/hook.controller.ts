/**
 * Hook Controller
 * HTTP endpoints for managing event hooks (CRUD + test)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { IHookRepository } from '../../domain/ports/repositories/hook.repository.port.js';
import {
  Hook,
  HookEvent,
  HookType,
  HookConfig,
  HookFilters,
} from '../../domain/entities/hook.entity.js';
import { HookExecutorService, HookContext } from '../../domain/services/hook-executor.service.js';

// Validation schemas
const hookEventSchema = z.enum([
  'session:start',
  'session:end',
  'session:error',
  'message:before',
  'message:after',
  'tool:before',
  'tool:after',
  'task:created',
  'task:status:change',
  'approval:pending',
  'approval:resolved',
  'git:commit:created',
  'git:commit:approved',
]);

const hookTypeSchema = z.enum(['shell', 'http', 'websocket']);

const shellConfigSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(300000).optional(),
  blocking: z.boolean().optional(),
});

const httpConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(60000).optional(),
  blocking: z.boolean().optional(),
});

const websocketConfigSchema = z.object({
  url: z.string(),
  channel: z.string().optional(),
});

const filtersSchema = z.object({
  toolNames: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  providers: z.array(z.string()).optional(),
}).optional();

const createHookSchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  event: hookEventSchema,
  type: hookTypeSchema,
  config: z.union([shellConfigSchema, httpConfigSchema, websocketConfigSchema]),
  filters: filtersSchema,
  enabled: z.boolean().optional().default(true),
  priority: z.number().int().min(-100).max(100).optional().default(0),
});

const updateHookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  event: hookEventSchema.optional(),
  type: hookTypeSchema.optional(),
  config: z.union([shellConfigSchema, httpConfigSchema, websocketConfigSchema]).optional(),
  filters: filtersSchema,
  enabled: z.boolean().optional(),
  priority: z.number().int().min(-100).max(100).optional(),
});

const testHookSchema = z.object({
  data: z.record(z.unknown()).optional(),
});

export function registerHookController(
  app: FastifyInstance,
  hookRepo: IHookRepository,
  hookExecutor: HookExecutorService
): void {
  // GET /api/hooks - List hooks with optional filters
  app.get('/api/hooks', async (request, reply) => {
    const { projectId, taskId, event, enabled } = request.query as {
      projectId?: string;
      taskId?: string;
      event?: string;
      enabled?: string;
    };

    const hooks = await hookRepo.findAll({
      projectId,
      taskId,
      event: event as HookEvent | undefined,
      enabled: enabled === undefined ? undefined : enabled === 'true',
    });

    return reply.send({
      hooks: hooks.map(h => serializeHook(h)),
      total: hooks.length,
    });
  });

  // GET /api/hooks/:id - Get single hook
  app.get('/api/hooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const hook = await hookRepo.findById(id);
    if (!hook) {
      return reply.status(404).send({ error: 'Hook not found' });
    }

    return reply.send({ hook: serializeHook(hook) });
  });

  // POST /api/hooks - Create hook
  app.post('/api/hooks', async (request, reply) => {
    const body = createHookSchema.parse(request.body);

    // Validate config matches type
    validateConfigForType(body.type, body.config);

    const hook = Hook.create(
      randomUUID(),
      body.projectId ?? null,
      body.taskId ?? null,
      body.name,
      body.event,
      body.type,
      body.config as HookConfig,
      body.filters as HookFilters | null ?? null,
      body.priority
    );

    if (!body.enabled) {
      hook.disable();
    }

    await hookRepo.save(hook);

    return reply.status(201).send({ hook: serializeHook(hook) });
  });

  // PATCH /api/hooks/:id - Update hook
  app.patch('/api/hooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateHookSchema.parse(request.body);

    const hook = await hookRepo.findById(id);
    if (!hook) {
      return reply.status(404).send({ error: 'Hook not found' });
    }

    // Apply updates
    if (body.name !== undefined) hook.name = body.name;
    if (body.event !== undefined) hook.event = body.event;
    if (body.type !== undefined) hook.type = body.type;
    if (body.config !== undefined) {
      validateConfigForType(hook.type, body.config);
      hook.updateConfig(body.config as HookConfig);
    }
    if (body.filters !== undefined) {
      hook.updateFilters(body.filters as HookFilters | null ?? null);
    }
    if (body.enabled !== undefined) {
      body.enabled ? hook.enable() : hook.disable();
    }
    if (body.priority !== undefined) hook.priority = body.priority;

    hook.updatedAt = new Date();
    await hookRepo.save(hook);

    return reply.send({ hook: serializeHook(hook) });
  });

  // DELETE /api/hooks/:id - Delete hook
  app.delete('/api/hooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await hookRepo.delete(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Hook not found' });
    }

    return reply.send({ success: true });
  });

  // POST /api/hooks/:id/test - Test hook execution
  app.post('/api/hooks/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = testHookSchema.parse(request.body ?? {});

    try {
      const result = await hookExecutor.testHook(id, {
        data: body.data ?? { test: true, timestamp: new Date().toISOString() },
      });

      return reply.send({
        result: {
          hookId: result.hookId,
          hookName: result.hookName,
          success: result.success,
          output: result.output,
          error: result.error,
          durationMs: result.durationMs,
        },
      });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Test failed',
      });
    }
  });

  // POST /api/hooks/execute - Manually trigger hooks for an event (for testing)
  app.post('/api/hooks/execute', async (request, reply) => {
    const body = z.object({
      event: hookEventSchema,
      projectId: z.string().uuid().optional(),
      taskId: z.string().uuid().optional(),
      sessionId: z.string().uuid().optional(),
      data: z.record(z.unknown()).optional(),
    }).parse(request.body);

    const context: HookContext = {
      event: body.event,
      projectId: body.projectId,
      taskId: body.taskId,
      sessionId: body.sessionId,
      data: body.data ?? {},
    };

    const results = await hookExecutor.execute(context);

    return reply.send({
      results: results.map(r => ({
        hookId: r.hookId,
        hookName: r.hookName,
        success: r.success,
        output: r.output,
        error: r.error,
        durationMs: r.durationMs,
      })),
      total: results.length,
    });
  });
}

function serializeHook(hook: Hook) {
  return {
    id: hook.id,
    projectId: hook.projectId,
    taskId: hook.taskId,
    name: hook.name,
    event: hook.event,
    type: hook.type,
    config: hook.config,
    filters: hook.filters,
    enabled: hook.enabled,
    priority: hook.priority,
    createdAt: hook.createdAt.toISOString(),
    updatedAt: hook.updatedAt.toISOString(),
  };
}

function validateConfigForType(type: HookType, config: unknown): void {
  switch (type) {
    case 'shell':
      shellConfigSchema.parse(config);
      break;
    case 'http':
      httpConfigSchema.parse(config);
      break;
    case 'websocket':
      websocketConfigSchema.parse(config);
      break;
  }
}
