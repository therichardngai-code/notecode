/**
 * Diff Controller
 * API endpoints for diff management and batch operations
 */

import { FastifyInstance } from 'fastify';
import { DiffRevertService } from '../../domain/services/diff-revert.service.js';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';

export function registerDiffController(
  app: FastifyInstance,
  diffRevertService: DiffRevertService,
  diffRepo: IDiffRepository,
  sessionRepo: ISessionRepository
): void {

  // GET /api/sessions/:sessionId/diffs - Get all diffs for session
  app.get('/api/sessions/:sessionId/diffs', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const diffs = await diffRepo.findBySessionId(sessionId);
    return reply.send({ diffs });
  });

  // POST /api/sessions/:sessionId/diffs/revert-all - Batch revert (for commit reject)
  app.post('/api/sessions/:sessionId/diffs/revert-all', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const result = await diffRevertService.revertAllSessionDiffs(sessionId, session.workingDir);

    if (result.success) {
      return reply.send(result);
    } else {
      return reply.status(207).send(result); // 207 Multi-Status for partial success
    }
  });

  // POST /api/sessions/:sessionId/diffs/approve-all - Batch approve (for commit approve)
  app.post('/api/sessions/:sessionId/diffs/approve-all', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const result = await diffRevertService.approveAllSessionDiffs(sessionId);
    return reply.send(result);
  });

  // POST /api/sessions/:sessionId/diffs/mark-applied - Mark all as applied after commit
  app.post('/api/sessions/:sessionId/diffs/mark-applied', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const count = await diffRevertService.markAllApplied(sessionId);
    return reply.send({ applied: count });
  });

  // POST /api/sessions/:sessionId/diffs/clear-content - Clear content from applied diffs
  app.post('/api/sessions/:sessionId/diffs/clear-content', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const count = await diffRevertService.clearAppliedContent(sessionId);
    return reply.send({ cleared: count });
  });

  // POST /api/diffs/:id/approve - Individual diff approve
  app.post('/api/diffs/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };

    const diff = await diffRepo.findById(id);
    if (!diff) {
      return reply.status(404).send({ error: 'Diff not found' });
    }
    if (diff.status !== 'pending') {
      return reply.status(400).send({ error: 'Diff already resolved' });
    }

    diff.approve();
    await diffRepo.save(diff);
    return reply.send({ success: true, diff: { id: diff.id, status: diff.status } });
  });

  // POST /api/diffs/:id/reject - Individual diff reject + revert file
  app.post('/api/diffs/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };

    const diff = await diffRepo.findById(id);
    if (!diff) {
      return reply.status(404).send({ error: 'Diff not found' });
    }
    if (diff.status !== 'pending') {
      return reply.status(400).send({ error: 'Diff already resolved' });
    }

    // Get session for working dir
    const session = await sessionRepo.findById(diff.sessionId);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Revert the single diff
    const result = await diffRevertService.revertDiff(id, session.workingDir);
    return reply.send({ success: result.success, result });
  });
}
