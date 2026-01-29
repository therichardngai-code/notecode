/**
 * SQLite Settings Repository
 * Manages global application settings
 */

import { eq } from 'drizzle-orm';
import { settings } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';
import { encrypt, decrypt, isEncryptionConfigured } from '../../infrastructure/crypto/index.js';

export interface ApprovalGateConfig {
  enabled: boolean;
  rules?: Array<{
    pattern: string;
    action: 'approve' | 'deny' | 'ask';
  }>;
}

export interface GlobalSettings {
  id: string;
  userName?: string;
  theme: string;
  defaultProvider?: string;
  defaultModel?: string;
  fallbackModel?: string;
  systemPrompt?: string;
  apiKeys?: Record<string, string>;
  yoloMode: boolean;
  autoExtractSummary: boolean;
  currentActiveProjectId?: string | null;
  dataRetentionEnabled: boolean;
  dataRetentionDays: number; // Days before auto-delete inactive tasks (default 90)
  approvalGate?: ApprovalGateConfig | null;
}

export interface ISettingsRepository {
  getGlobal(): Promise<GlobalSettings>;
  updateGlobal(settings: Partial<GlobalSettings>): Promise<GlobalSettings>;
}

export class SqliteSettingsRepository implements ISettingsRepository {
  async getGlobal(): Promise<GlobalSettings> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 'global'))
      .limit(1);

    if (rows.length === 0) {
      // Create default settings with required values
      const defaultSettings: GlobalSettings = {
        id: 'global',
        theme: 'system',
        defaultProvider: 'anthropic',
        defaultModel: 'sonnet',
        fallbackModel: 'haiku',
        yoloMode: false,
        autoExtractSummary: false,
        dataRetentionEnabled: false,
        dataRetentionDays: 90,
      };
      await db.insert(settings).values({
        id: 'global',
        theme: 'system',
        defaultProvider: 'anthropic',
        defaultModel: 'sonnet',
        fallbackModel: 'haiku',
        yoloMode: false,
        autoExtractSummary: false,
        dataRetentionEnabled: false,
        dataRetentionDays: 90,
      });
      return defaultSettings;
    }

    const row = rows[0];
    return {
      id: row.id,
      userName: row.userName ?? undefined,
      theme: row.theme ?? 'system',
      defaultProvider: row.defaultProvider ?? undefined,
      defaultModel: row.defaultModel ?? undefined,
      fallbackModel: row.fallbackModel ?? undefined,
      systemPrompt: row.systemPrompt ?? undefined,
      apiKeys: row.apiKeys ? this.decryptApiKeys(row.apiKeys) : undefined,
      yoloMode: row.yoloMode ?? false,
      autoExtractSummary: row.autoExtractSummary ?? true,
      currentActiveProjectId: row.currentActiveProjectId ?? undefined,
      dataRetentionEnabled: row.dataRetentionEnabled ?? false,
      dataRetentionDays: row.dataRetentionDays ?? 90,
      approvalGate: row.approvalGate ? JSON.parse(row.approvalGate) : null,
    };
  }

  async updateGlobal(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
    const db = getDatabase();
    const data: Record<string, unknown> = {};

    if (updates.userName !== undefined) data.userName = updates.userName;
    if (updates.theme !== undefined) data.theme = updates.theme;
    if (updates.defaultProvider !== undefined) data.defaultProvider = updates.defaultProvider;
    if (updates.defaultModel !== undefined) data.defaultModel = updates.defaultModel;
    if (updates.fallbackModel !== undefined) data.fallbackModel = updates.fallbackModel;
    if (updates.systemPrompt !== undefined) data.systemPrompt = updates.systemPrompt;
    if (updates.apiKeys !== undefined) data.apiKeys = this.encryptApiKeys(updates.apiKeys);
    if (updates.yoloMode !== undefined) data.yoloMode = updates.yoloMode;
    if (updates.autoExtractSummary !== undefined) data.autoExtractSummary = updates.autoExtractSummary;
    if (updates.currentActiveProjectId !== undefined) data.currentActiveProjectId = updates.currentActiveProjectId;
    if (updates.dataRetentionEnabled !== undefined) data.dataRetentionEnabled = updates.dataRetentionEnabled;
    if (updates.dataRetentionDays !== undefined) data.dataRetentionDays = updates.dataRetentionDays;
    if (updates.approvalGate !== undefined) data.approvalGate = updates.approvalGate ? JSON.stringify(updates.approvalGate) : null;

    await db
      .update(settings)
      .set(data)
      .where(eq(settings.id, 'global'));

    return this.getGlobal();
  }

  /**
   * Encrypt API keys for storage
   * Falls back to plain JSON if encryption not configured
   */
  private encryptApiKeys(apiKeys: Record<string, string>): string {
    const json = JSON.stringify(apiKeys);

    if (!isEncryptionConfigured()) {
      // Fallback: store as plain JSON (backward compatible)
      return json;
    }

    return encrypt(json);
  }

  /**
   * Decrypt API keys from storage
   * Handles both encrypted and plain JSON (backward compatible)
   */
  private decryptApiKeys(stored: string): Record<string, string> {
    // Check if it's encrypted format (iv:ciphertext:authTag)
    if (stored.includes(':') && isEncryptionConfigured()) {
      try {
        const decrypted = decrypt(stored);
        return JSON.parse(decrypted);
      } catch {
        // If decryption fails, try plain JSON (migration case)
        try {
          return JSON.parse(stored);
        } catch {
          return {};
        }
      }
    }

    // Plain JSON (not encrypted or no encryption key)
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
}
