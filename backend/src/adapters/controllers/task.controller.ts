/**
 * Task Controller
 * HTTP endpoints for task management
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { Task } from '../../domain/entities/task.entity.js';
import {
  TaskStatus,
  TaskPriority,
  AgentRole,
  ProviderType,
} from '../../domain/value-objects/task-status.vo.js';

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(), // For subtasks
  dependencies: z.array(z.string().uuid()).optional().default([]), // Task IDs that must complete first
  title: z.string().min(1),
  description: z.string().optional().default(''),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  agentId: z.string().uuid().optional(),
  agentRole: z.enum(['researcher', 'planner', 'coder', 'reviewer', 'tester']).optional(),
  provider: z.enum(['anthropic', 'google', 'openai']).optional(),
  model: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
  tools: z.object({
    mode: z.enum(['allowlist', 'blocklist']),
    tools: z.array(z.string()),
  }).optional(),
  contextFiles: z.array(z.string()).optional().default([]),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['not-started', 'in-progress', 'review', 'done', 'cancelled', 'archived']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  agentId: z.string().uuid().nullable().optional(),
  agentRole: z.enum(['researcher', 'planner', 'coder', 'reviewer', 'tester']).nullable().optional(),
  provider: z.enum(['anthropic', 'google', 'openai']).nullable().optional(),
  model: z.string().nullable().optional(),
});

const moveTaskSchema = z.object({
  status: z.enum(['not-started', 'in-progress', 'review', 'done', 'cancelled', 'archived']),
  position: z.number().int().min(0).optional(),
});

export function registerTaskController(
  app: FastifyInstance,
  taskRepo: ITaskRepository
): void {
  // GET /api/tasks - List tasks by project
  app.get('/api/tasks', async (request, reply) => {
    const { projectId, status, priority, search, agentId } = request.query as Record<string, string>;

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' });
    }

    const tasks = await taskRepo.findByProjectId(projectId, {
      status: status?.split(',') as TaskStatus[],
      priority: priority?.split(',') as TaskPriority[],
      search,
      agentId,
    });

    return reply.send({ tasks });
  });

  // GET /api/tasks/:id - Get single task
  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await taskRepo.findById(id);

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task });
  });

  // GET /api/tasks/stats - Get task counts by status
  app.get('/api/tasks/stats', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' });
    }

    const counts = await taskRepo.countByStatus(projectId);
    return reply.send({ counts });
  });

  // POST /api/tasks - Create task
  app.post('/api/tasks', async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    const now = new Date();

    const task = new Task(
      randomUUID(),
      body.projectId,
      body.agentId ?? null,
      body.parentId ?? null,
      body.dependencies ?? [],
      body.title,
      body.description,
      TaskStatus.NOT_STARTED,
      body.priority as TaskPriority,
      null,
      null,
      body.agentRole as AgentRole | null ?? null,
      body.provider as ProviderType | null ?? null,
      body.model ?? null,
      body.skills,
      body.tools ?? null,
      body.contextFiles,
      null,
      now,
      now,
      null,
      null
    );

    await taskRepo.save(task);
    return reply.status(201).send({ task });
  });

  // PATCH /api/tasks/:id - Update task
  app.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);

    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Apply updates
    if (body.title) {
      task.updateTitle(body.title);
    }
    if (body.description !== undefined) {
      task.updateDescription(body.description);
    }
    if (body.priority) {
      task.updatePriority(body.priority as TaskPriority);
    }
    if (body.agentId !== undefined) {
      task.assignAgent(body.agentId);
    }
    if (body.agentRole !== undefined || body.provider !== undefined || body.model !== undefined) {
      task.setAgentConfiguration(
        body.agentRole !== undefined ? body.agentRole as AgentRole | null : task.agentRole,
        body.provider !== undefined ? body.provider as ProviderType | null : task.provider,
        body.model !== undefined ? body.model : task.model
      );
    }
    if (body.status) {
      task.updateStatus(body.status as TaskStatus);
    }

    await taskRepo.save(task);
    return reply.send({ task });
  });

  // POST /api/tasks/:id/move - Move task (drag & drop)
  app.post('/api/tasks/:id/move', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = moveTaskSchema.parse(request.body);

    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    try {
      task.updateStatus(body.status as TaskStatus);
      await taskRepo.save(task);
      return reply.send({ task });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid status transition';
      return reply.status(400).send({ error: message });
    }
  });

  // DELETE /api/tasks/:id - Delete task
  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await taskRepo.delete(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ success: true });
  });
}
