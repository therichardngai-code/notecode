/**
 * Version Controller
 * HTTP endpoints for version checking and update management
 */

import { FastifyInstance } from 'fastify';
import { VersionCheckService } from '../services/version-check.service.js';

export function registerVersionController(
  app: FastifyInstance,
  versionService: VersionCheckService
): void {
  /**
   * GET /api/version/check
   * Check for available updates
   */
  app.get('/api/version/check', async (request, reply) => {
    const { refresh } = request.query as { refresh?: string };
    const forceRefresh = refresh === 'true';

    const info = await versionService.checkForUpdates(forceRefresh);
    return reply.send(info);
  });

  /**
   * GET /api/version/instructions
   * Get update instructions for a specific version
   */
  app.get('/api/version/instructions', async (request, reply) => {
    const { version } = request.query as { version?: string };
    const instructions = versionService.getUpdateInstructions(version);
    return reply.send(instructions);
  });

  /**
   * GET /api/version/current
   * Get just the current version
   */
  app.get('/api/version/current', async (_request, reply) => {
    return reply.send({
      version: versionService.getCurrentVersion(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      deploymentMode: versionService.getDeploymentMode(),
    });
  });
}
