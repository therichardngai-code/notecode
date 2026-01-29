/**
 * Settings API
 * HTTP client for settings endpoints (API keys, preferences, encryption)
 */

import { apiClient } from './api-client';

// Approval gate rule (shared with projects)
export interface ApprovalGateRule {
  pattern: string;
  action: 'approve' | 'deny' | 'ask';
}

export interface ApprovalGateConfig {
  enabled: boolean;
  rules?: ApprovalGateRule[];
}

// Types
export interface GlobalSettings {
  id: string;
  userName?: string;
  theme: 'light' | 'dark' | 'system';
  defaultProvider?: 'anthropic' | 'google' | 'openai';
  defaultModel?: string;
  fallbackModel?: string;
  systemPrompt?: string;
  apiKeys: {
    anthropic: boolean;
    google: boolean;
    openai: boolean;
  };
  yoloMode: boolean;
  autoExtractSummary: boolean;
  encryptionConfigured: boolean;
  currentActiveProjectId?: string | null; // Default project for task creation
  dataRetentionEnabled?: boolean; // Enable auto-delete old tasks
  dataRetentionDays?: number; // Days before delete (default: 90)
  approvalGate?: ApprovalGateConfig | null; // Global approval gate
}

export interface EncryptionStatus {
  configured: boolean;
  message: string;
}

export interface SetApiKeyRequest {
  provider: 'anthropic' | 'google' | 'openai';
  apiKey: string;
}

/**
 * Settings API methods
 */
export const settingsApi = {
  /** Get all settings (API keys are masked) */
  getSettings: () =>
    apiClient.get<GlobalSettings>('/api/settings'),

  /** Update settings */
  updateSettings: (settings: Partial<GlobalSettings>) =>
    apiClient.patch<GlobalSettings>('/api/settings', settings),

  /** Set API key for provider */
  setApiKey: (provider: 'anthropic' | 'google' | 'openai', apiKey: string) =>
    apiClient.post<{ success: boolean }>('/api/settings/api-key', { provider, apiKey }),

  /** Remove API key */
  removeApiKey: (provider: string) =>
    apiClient.delete<{ success: boolean }>(`/api/settings/api-key/${provider}`),

  /** Get encryption status */
  getEncryptionStatus: () =>
    apiClient.get<EncryptionStatus>('/api/settings/encryption-status'),
};
