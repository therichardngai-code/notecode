/**
 * Backup Controller
 * HTTP endpoints for data export and import
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExportDataUseCase, ExportOptions } from '../../use-cases/backup/export-data.use-case.js';

const exportOptionsSchema = z.object({
  includeProjects: z.boolean().optional(),
  includeTasks: z.boolean().optional(),
  includeSessions: z.boolean().optional(),
  includeMessages: z.boolean().optional(),
  projectIds: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string().transform(s => new Date(s)),
    to: z.string().transform(s => new Date(s)),
  }).optional(),
});

export function registerBackupController(
  app: FastifyInstance,
  exportDataUseCase: ExportDataUseCase
): void {
  /**
   * POST /api/backup/export
   * Export data to JSON
   */
  app.post('/api/backup/export', async (request, reply) => {
    const options = exportOptionsSchema.parse(request.body || {}) as ExportOptions;
    const result = await exportDataUseCase.execute(options);

    if (!result.success) {
      return reply.status(500).send({ error: result.error });
    }

    // Set headers for file download
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="notecode-export-${Date.now()}.json"`);

    return reply.send(result.data);
  });

  /**
   * GET /api/backup/export
   * Quick export of all data
   */
  app.get('/api/backup/export', async (_request, reply) => {
    const result = await exportDataUseCase.execute({
      includeProjects: true,
      includeTasks: true,
      includeSessions: true,
      includeMessages: true,
    });

    if (!result.success) {
      return reply.status(500).send({ error: result.error });
    }

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="notecode-export-${Date.now()}.json"`);

    return reply.send(result.data);
  });

  /**
   * POST /api/backup/import
   * Import data from JSON (placeholder)
   */
  app.post('/api/backup/import', async (_request, reply) => {
    // TODO: Implement import logic
    return reply.status(501).send({
      error: 'Not implemented',
      message: 'Data import is not yet implemented',
    });
  });
}
