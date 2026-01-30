/**
 * CLI Provider Hooks Controller
 * HTTP endpoints for managing CLI provider hooks and settings (Claude, Gemini, Codex, etc.)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CliProviderHooksService,
  CliProvider,
  PROVIDER_HOOK_TYPES,
} from '../services/cli-provider-hooks.service.js';

// Validation schemas
const providerSchema = z.enum(['claude', 'gemini', 'codex']);

const createHookSchema = z.object({
  projectId: z.string().uuid().optional(),
  provider: providerSchema,
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with dashes'),
  hookType: z.string().min(1),
  script: z.string().min(1),
  enabled: z.boolean().optional().default(true),
  scope: z.enum(['project', 'global']).optional().default('project'),
});

const updateHookSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  hookType: z.string().min(1).optional(),
  script: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const saveSettingsSchema = z.object({
  provider: providerSchema,
  projectId: z.string().uuid().optional(),
  settings: z.record(z.unknown()),
});

export function registerCliProviderHooksController(
  app: FastifyInstance,
  service: CliProviderHooksService
): void {
  // ============ HOOKS ENDPOINTS ============

  // GET /api/cli-hooks - List hooks with filters
  app.get('/api/cli-hooks', async (request, reply) => {
    const { projectId, provider, scope, enabled } = request.query as {
      projectId?: string;
      provider?: string;
      scope?: string;
      enabled?: string;
    };

    const hooks = await service.listHooks({
      projectId: projectId === 'null' ? null : projectId,
      provider: provider as CliProvider | undefined,
      scope: scope as 'project' | 'global' | undefined,
      enabled: enabled === undefined ? undefined : enabled === 'true',
    });

    return reply.send({ hooks, total: hooks.length });
  });

  // GET /api/cli-hooks/templates/:provider - Get hook templates for a provider
  app.get('/api/cli-hooks/templates/:provider', async (request, reply) => {
    const { provider } = request.params as { provider: string };

    if (!['claude', 'gemini', 'codex'].includes(provider)) {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    const templates = service.getHookTemplates(provider as CliProvider);
    const hookTypes = PROVIDER_HOOK_TYPES[provider as CliProvider];

    return reply.send({ templates, hookTypes });
  });

  // GET /api/cli-hooks/:id - Get single hook
  app.get('/api/cli-hooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const hook = await service.getHookById(id);

    if (!hook) {
      return reply.status(404).send({ error: 'Hook not found' });
    }

    return reply.send({ hook });
  });

  // POST /api/cli-hooks - Create hook
  app.post('/api/cli-hooks', async (request, reply) => {
    const body = createHookSchema.parse(request.body);

    try {
      const hook = await service.createHook(body);
      return reply.status(201).send({ hook });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to create hook',
      });
    }
  });

  // PATCH /api/cli-hooks/:id - Update hook
  app.patch('/api/cli-hooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateHookSchema.parse(request.body);

    try {
      const hook = await service.updateHook(id, body);
      if (!hook) {
        return reply.status(404).send({ error: 'Hook not found' });
      }
      return reply.send({ hook });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to update hook',
      });
    }
  });

  // DELETE /api/cli-hooks/:id - Delete hook
  app.delete('/api/cli-hooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await service.deleteHook(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Hook not found' });
    }

    return reply.send({ success: true });
  });

  // POST /api/cli-hooks/:id/sync - Sync hook to filesystem
  app.post('/api/cli-hooks/:id/sync', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await service.syncHookToFilesystem(id);
      return reply.send({ success: true, message: 'Hook synced to filesystem' });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to sync hook',
      });
    }
  });

  // POST /api/cli-hooks/sync-all - Sync all hooks for a project
  app.post('/api/cli-hooks/sync-all', async (request, reply) => {
    const { projectId } = request.body as { projectId?: string };

    try {
      const count = await service.syncAllHooksToFilesystem(projectId);
      return reply.send({ success: true, synced: count });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to sync hooks',
      });
    }
  });

  // ============ SETTINGS ENDPOINTS ============

  // GET /api/cli-settings/:provider - Get settings for a provider
  app.get('/api/cli-settings/:provider', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const { projectId } = request.query as { projectId?: string };

    if (!['claude', 'gemini', 'codex'].includes(provider)) {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    const settings = await service.getSettings(provider as CliProvider, projectId);

    if (!settings) {
      return reply.send({ settings: null });
    }

    return reply.send({ settings });
  });

  // PUT /api/cli-settings - Save settings
  app.put('/api/cli-settings', async (request, reply) => {
    const body = saveSettingsSchema.parse(request.body);

    try {
      const settings = await service.saveSettings(
        body.provider,
        body.settings,
        body.projectId
      );
      return reply.send({ settings });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to save settings',
      });
    }
  });

  // POST /api/cli-settings/:provider/sync - Sync settings to filesystem
  app.post('/api/cli-settings/:provider/sync', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const { projectId } = request.body as { projectId?: string };

    if (!['claude', 'gemini', 'codex'].includes(provider)) {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    try {
      await service.syncSettingsToFilesystem(provider as CliProvider, projectId);
      return reply.send({ success: true, message: 'Settings synced to filesystem' });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to sync settings',
      });
    }
  });

  // ============ METADATA ENDPOINTS ============

  // GET /api/cli-providers - List supported providers and their hook types
  app.get('/api/cli-providers', async (_request, reply) => {
    return reply.send({
      providers: Object.entries(PROVIDER_HOOK_TYPES).map(([provider, hookTypes]) => ({
        provider,
        hookTypes,
        directory: `.${provider}`,
      })),
    });
  });
}
