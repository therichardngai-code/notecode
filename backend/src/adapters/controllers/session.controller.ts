/**
 * Session Controller
 * HTTP endpoints for session management with use case integration
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { IMessageRepository } from '../../domain/ports/repositories/message.repository.port.js';
import { Session } from '../../domain/entities/session.entity.js';
import { ProviderType } from '../../domain/value-objects/task-status.vo.js';
import { StartSessionUseCase } from '../../use-cases/sessions/start-session.use-case.js';
import { StopSessionUseCase } from '../../use-cases/sessions/stop-session.use-case.js';
import { PauseSessionUseCase } from '../../use-cases/sessions/pause-session.use-case.js';

// Schema for creating session directly (legacy)
const createSessionSchema = z.object({
  taskId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  name: z.string().optional(),
  provider: z.enum(['anthropic', 'google', 'openai']).optional(),
  workingDir: z.string().min(1),
});

// Schema for starting a session (spawns CLI)
const startSessionSchema = z.object({
  taskId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  initialPrompt: z.string().optional(),
  resumeSessionId: z.string().uuid().optional(),
  forkSession: z.boolean().optional(),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions']).optional(),
  maxBudgetUsd: z.number().positive().optional(),
  mode: z.enum(['renew', 'retry', 'fork']).optional(),  // renew=fresh, retry=resume, fork=new+context
  // Session-level overrides
  model: z.string().optional(),  // Override task model
  files: z.array(z.string()).optional(),  // Files to add to context
  disableWebTools: z.boolean().optional(),  // Disable WebSearch/WebFetch
});

// Dependencies container for use cases
export interface SessionControllerDeps {
  sessionRepo: ISessionRepository;
  messageRepo?: IMessageRepository;
  startSessionUseCase?: StartSessionUseCase;
  stopSessionUseCase?: StopSessionUseCase;
  pauseSessionUseCase?: PauseSessionUseCase;
}

export function registerSessionController(
  app: FastifyInstance,
  deps: SessionControllerDeps | ISessionRepository
): void {
  // Support both old (repo only) and new (deps object) signatures
  const sessionRepo = 'findById' in deps ? deps : deps.sessionRepo;
  const messageRepo = 'findById' in deps ? undefined : deps.messageRepo;
  const startSessionUseCase = 'findById' in deps ? undefined : deps.startSessionUseCase;
  const stopSessionUseCase = 'findById' in deps ? undefined : deps.stopSessionUseCase;
  const pauseSessionUseCase = 'findById' in deps ? undefined : deps.pauseSessionUseCase;

  // GET /api/sessions - List sessions
  app.get('/api/sessions', async (request, reply) => {
    const { taskId, limit } = request.query as Record<string, string>;

    if (taskId) {
      const sessions = await sessionRepo.findByTaskId(taskId);
      return reply.send({ sessions });
    }

    const sessions = await sessionRepo.findRecent(
      limit ? parseInt(limit, 10) : 20
    );
    return reply.send({ sessions });
  });

  // GET /api/sessions/running - Get running sessions
  app.get('/api/sessions/running', async (_request, reply) => {
    const sessions = await sessionRepo.findRunning();
    return reply.send({ sessions });
  });

  // GET /api/sessions/:id - Get single session
  app.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await sessionRepo.findById(id);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send({ session });
  });

  // POST /api/sessions - Start new session with CLI spawn
  app.post('/api/sessions', async (request, reply) => {
    // If use case is available, use it
    if (startSessionUseCase) {
      const body = startSessionSchema.parse(request.body);
      const result = await startSessionUseCase.execute(body);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send({
        session: result.session,
        wsUrl: `/ws/session/${result.session!.id}`,
      });
    }

    // Fallback to legacy behavior (create queued session only)
    const body = createSessionSchema.parse(request.body);

    const session = Session.create(
      randomUUID(),
      body.taskId,
      body.name ?? `Session ${new Date().toISOString()}`,
      body.provider as ProviderType | null ?? null,
      body.workingDir,
      body.agentId
    );

    await sessionRepo.save(session);
    return reply.status(201).send({ session });
  });

  // POST /api/sessions/:id/pause - Pause session
  app.post('/api/sessions/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (pauseSessionUseCase) {
      const result = await pauseSessionUseCase.execute(id);
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.send({ success: true });
    }

    // Fallback to direct session update
    const session = await sessionRepo.findById(id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    try {
      session.pause();
      await sessionRepo.save(session);
      return reply.send({ session });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot pause session';
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/sessions/:id/resume - Resume session
  app.post('/api/sessions/:id/resume', async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await sessionRepo.findById(id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    try {
      session.resume();
      await sessionRepo.save(session);
      return reply.send({ session });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot resume session';
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/sessions/:id/stop - Stop/cancel session
  app.post('/api/sessions/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (stopSessionUseCase) {
      const result = await stopSessionUseCase.execute(id);
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.send({ success: true });
    }

    // Fallback to direct session update
    const session = await sessionRepo.findById(id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    try {
      session.cancel();
      await sessionRepo.save(session);
      return reply.send({ session });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot stop session';
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/sessions/:id/messages - Get session messages (full conversation if resumed)
  app.get('/api/sessions/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };

    const session = await sessionRepo.findById(id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (!messageRepo) {
      return reply.send({ messages: [] });
    }

    // If session has providerSessionId, get full conversation history
    const messages = session.providerSessionId
      ? await messageRepo.findByProviderSessionId(
          session.providerSessionId,
          limit ? parseInt(limit, 10) : 200
        )
      : await messageRepo.findRecent(
          id,
          limit ? parseInt(limit, 10) : 50
        );

    return reply.send({ messages });
  });

  // DELETE /api/sessions/:id - Delete session
  app.delete('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await sessionRepo.delete(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send({ success: true });
  });
}
