/**
 * Settings API
 * HTTP client for settings endpoints (API keys, preferences, encryption)
 */

import { apiClient } from './api-client';

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
