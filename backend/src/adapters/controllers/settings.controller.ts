/**
 * Settings Controller
 * HTTP endpoints for managing global application settings and API keys
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ISettingsRepository } from '../repositories/sqlite-settings.repository.js';
import { isEncryptionConfigured } from '../../infrastructure/crypto/index.js';
import { CliProviderHooksService } from '../services/cli-provider-hooks.service.js';
import { ApprovalGateConfig } from '../../domain/value-objects/approval-gate-config.vo.js';

// ApprovalGateConfig schema (matches domain VO)
const approvalGateSchema = z.object({
  enabled: z.boolean(),
  timeoutSeconds: z.number().int().positive().optional(),
  defaultOnTimeout: z.enum(['approve', 'deny']).optional(),
  autoAllowTools: z.array(z.string()).optional(),
  requireApprovalTools: z.array(z.string()).optional(),
  dangerousPatterns: z.object({
    commands: z.array(z.string()).optional(),
    files: z.array(z.string()).optional(),
  }).optional(),
});

const updateSettingsSchema = z.object({
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
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
  settingsRepo: ISettingsRepository,
  cliHooksService?: CliProviderHooksService
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

    // Get current settings for comparison (for approval gate auto-provision)
    const current = await settingsRepo.getGlobal();
    const updated = await settingsRepo.updateGlobal(body);

    // Handle approvalGate changes - auto-provision/unprovision CLI hook
    if (body.approvalGate !== undefined && cliHooksService) {
      const wasEnabled = current.approvalGate?.enabled ?? false;
      const isEnabled = body.approvalGate?.enabled ?? false;

      try {
        if (!wasEnabled && isEnabled) {
          // Turning ON: provision hook
          await cliHooksService.provisionApprovalGateHook(
            'global',
            undefined,
            body.approvalGate as ApprovalGateConfig
          );
          console.log('[Settings] Approval gate enabled - hook provisioned');
        } else if (wasEnabled && !isEnabled) {
          // Turning OFF: unprovision hook
          await cliHooksService.unprovisionApprovalGateHook('global');
          console.log('[Settings] Approval gate disabled - hook unprovisioned');
        } else if (isEnabled) {
          // Config changed while enabled: re-sync
          await cliHooksService.provisionApprovalGateHook(
            'global',
            undefined,
            body.approvalGate as ApprovalGateConfig
          );
          console.log('[Settings] Approval gate config updated - hook re-synced');
        }
      } catch (error) {
        console.error('[Settings] Failed to provision/unprovision approval gate hook:', error);
        // Don't fail the settings update, just log the error
      }
    }

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
