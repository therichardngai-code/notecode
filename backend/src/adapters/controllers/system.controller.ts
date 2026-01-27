/**
 * System Controller
 * HTTP endpoints for system-level operations (folder picker, path validation)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { selectFolder, validatePath, getPlatformInfo } from '../services/folder-picker.service.js';

const selectFolderSchema = z.object({
  title: z.string().optional(),
  initialPath: z.string().optional(),
});

const validatePathSchema = z.object({
  path: z.string().min(1),
});

export function registerSystemController(app: FastifyInstance): void {
  /**
   * GET /api/system/platform
   * Returns platform info and folder picker support status
   */
  app.get('/api/system/platform', async (_request, reply) => {
    const info = getPlatformInfo();
    return reply.send(info);
  });

  /**
   * POST /api/system/select-folder
   * Opens native OS folder picker dialog
   * @param title - Dialog title (optional)
   * @param initialPath - Initial directory to open (optional)
   * @returns { path, name, cancelled, error?, platform? }
   */
  app.post('/api/system/select-folder', async (request, reply) => {
    const options = selectFolderSchema.parse(request.body || {});

    const result = await selectFolder(options);

    return reply.send(result);
  });

  /**
   * POST /api/system/validate-path
   * Validates if a path exists and is a directory
   * @param path - Path to validate
   * @returns { exists, isDirectory, name }
   */
  app.post('/api/system/validate-path', async (request, reply) => {
    const { path } = validatePathSchema.parse(request.body);

    const result = validatePath(path);

    return reply.send(result);
  });
}
