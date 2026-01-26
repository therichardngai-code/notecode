/**
 * Memory Controller
 * REST API endpoints for memory management
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { IMemoryRepository } from '../../domain/ports/repositories/memory.repository.port.js';
import { ExtractMemoryUseCase } from '../../use-cases/memory/extract-memory.use-case.js';
import { MemoryInjectionService } from '../services/memory-injection.service.js';

const searchSchema = z.object({
  q: z.string().min(1),
  projectId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

const injectSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1),
  agentId: z.string().uuid().optional(),
  maxMemories: z.number().min(1).max(20).optional(),
  maxSummaries: z.number().min(1).max(10).optional(),
});

const MEMORY_DISABLED_ERROR = {
  error: 'Memory system disabled',
  message: 'No embedding API key configured. Set GOOGLE_API_KEY or OPENAI_API_KEY in settings or environment.',
};

export function registerMemoryController(
  app: FastifyInstance,
  memoryRepo: IMemoryRepository | null,
  extractMemory: ExtractMemoryUseCase,
  injectionService: MemoryInjectionService
) {
  // GET /api/memory/search - Vector similarity search
  app.get('/api/memory/search', async (request, reply) => {
    if (!memoryRepo) {
      return reply.status(503).send(MEMORY_DISABLED_ERROR);
    }
    try {
      const query = request.query as Record<string, string>;
      const { q, projectId, limit } = searchSchema.parse(query);

      const memories = await memoryRepo.searchSimilar(q, projectId, limit);
      return reply.send({ memories });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      throw error;
    }
  });

  // GET /api/memory/project/:projectId - List memories for project
  app.get('/api/memory/project/:projectId', async (request, reply) => {
    if (!memoryRepo) {
      return reply.status(503).send(MEMORY_DISABLED_ERROR);
    }
    const { projectId } = request.params as { projectId: string };
    const { category, limit } = request.query as { category?: string; limit?: string };

    const memories = await memoryRepo.findByProject(projectId, {
      category,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return reply.send({ memories });
  });

  // POST /api/memory/inject - Get injection preview (for testing)
  app.post('/api/memory/inject', async (request, reply) => {
    try {
      const body = injectSchema.parse(request.body);

      const result = await injectionService.injectIntoPrompt('', {
        projectId: body.projectId,
        prompt: body.prompt,
        agentId: body.agentId,
        maxMemories: body.maxMemories,
        maxSummaries: body.maxSummaries,
      });

      return reply.send({
        context: result.injectedPrompt,
        memoriesUsed: result.memoriesUsed,
        summariesUsed: result.summariesUsed,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body', details: error.errors });
      }
      throw error;
    }
  });

  // POST /api/sessions/:id/extract-memory - Extract memory from session
  app.post('/api/sessions/:id/extract-memory', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await extractMemory.execute({ sessionId: id });

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result);
  });

  // DELETE /api/memory/:id - Delete memory
  app.delete('/api/memory/:id', async (request, reply) => {
    if (!memoryRepo) {
      return reply.status(503).send(MEMORY_DISABLED_ERROR);
    }
    const { id } = request.params as { id: string };
    await memoryRepo.delete(id);
    return reply.send({ success: true });
  });

  // DELETE /api/memory/session/:sessionId - Delete all memories for session
  app.delete('/api/memory/session/:sessionId', async (request, reply) => {
    if (!memoryRepo) {
      return reply.status(503).send(MEMORY_DISABLED_ERROR);
    }
    const { sessionId } = request.params as { sessionId: string };
    const count = await memoryRepo.deleteBySession(sessionId);
    return reply.send({ success: true, deleted: count });
  });

  // GET /api/memory/status - Check memory system status
  app.get('/api/memory/status', async (_request, reply) => {
    return reply.send({
      enabled: !!memoryRepo,
      message: memoryRepo
        ? 'Memory system active'
        : 'Memory system disabled. Configure embedding API key to enable.',
    });
  });
}
