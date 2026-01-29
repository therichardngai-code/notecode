/**
 * Settings Controller
 * HTTP endpoints for managing global application settings and API keys
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ISettingsRepository } from '../repositories/sqlite-settings.repository.js';
import { isEncryptionConfigured } from '../../infrastructure/crypto/index.js';

const approvalGateSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(z.object({
    pattern: z.string(),
    action: z.enum(['approve', 'deny', 'ask']),
  })).optional(),
});

const updateSettingsSchema = z.object({
  userName: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultProvider: z.enum(['anthropic', 'google', 'openai']).optional(),
  defaultModel: z.string().optional(),
  fallbackModel: z.string().optional(),
  systemPrompt: z.string().optional(),
  yoloMode: z.boolean().optional(),
  autoExtractSummary: z.boolean().optional(),
  currentActiveProjectId: z.string().uuid().nullable().optional(),
  dataRetentionEnabled: z.boolean().optional(),
  dataRetentionDays: z.number().int().min(1).max(365).optional(),
  approvalGate: approvalGateSchema.nullable().optional(),
});

const updateApiKeySchema = z.object({
  provider: z.enum(['anthropic', 'google', 'openai']),
  apiKey: z.string().min(1),
});

export function registerSettingsController(
  app: FastifyInstance,
  settingsRepo: ISettingsRepository
): void {
  /**
   * GET /api/settings
   * Returns current settings with masked API keys
   */
  app.get('/api/settings', async (_request, reply) => {
    const settings = await settingsRepo.getGlobal();

    // Only show which API keys are configured, not the actual values
    const apiKeysStatus = {
      anthropic: !!settings.apiKeys?.anthropic,
      google: !!settings.apiKeys?.google,
      openai: !!settings.apiKeys?.openai,
    };

    return reply.send({
      ...settings,
      apiKeys: apiKeysStatus,
      encryptionConfigured: isEncryptionConfigured(),
    });
  });

  /**
   * PATCH /api/settings
   * Update settings (excluding API keys)
   */
  app.patch('/api/settings', async (request, reply) => {
    const body = updateSettingsSchema.parse(request.body);
    const updated = await settingsRepo.updateGlobal(body);

    // Mask API keys in response
    const apiKeysStatus = {
      anthropic: !!updated.apiKeys?.anthropic,
      google: !!updated.apiKeys?.google,
      openai: !!updated.apiKeys?.openai,
    };

    return reply.send({
      ...updated,
      apiKeys: apiKeysStatus,
    });
  });

  /**
   * POST /api/settings/api-key
   * Set an API key for a provider
   */
  app.post('/api/settings/api-key', async (request, reply) => {
    const { provider, apiKey } = updateApiKeySchema.parse(request.body);
    const current = await settingsRepo.getGlobal();

    // Store encrypted key
    const apiKeys = {
      ...current.apiKeys,
      [provider]: apiKey, // Repository handles encryption
    };

    await settingsRepo.updateGlobal({ apiKeys });

    return reply.send({
      success: true,
      provider,
      encrypted: isEncryptionConfigured(),
    });
  });

  /**
   * DELETE /api/settings/api-key/:provider
   * Remove an API key
   */
  app.delete('/api/settings/api-key/:provider', async (request, reply) => {
    const { provider } = request.params as { provider: string };

    if (!['anthropic', 'google', 'openai'].includes(provider)) {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    const current = await settingsRepo.getGlobal();
    const apiKeys = { ...current.apiKeys };
    delete apiKeys[provider as keyof typeof apiKeys];

    await settingsRepo.updateGlobal({ apiKeys });

    return reply.send({ success: true, provider });
  });

  /**
   * GET /api/settings/encryption-status
   * Check if encryption is configured
   */
  app.get('/api/settings/encryption-status', async (_request, reply) => {
    return reply.send({
      configured: isEncryptionConfigured(),
      message: isEncryptionConfigured()
        ? 'API keys are encrypted at rest'
        : 'Set NOTECODE_ENCRYPTION_KEY to enable encryption',
    });
  });
}
