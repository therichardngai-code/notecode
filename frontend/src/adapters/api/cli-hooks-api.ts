/**
 * CLI Hooks API
 * HTTP client for CLI provider hooks management (Claude, Gemini, Codex)
 */

import { apiClient } from './api-client';

// Types
export type CliProvider = 'claude' | 'gemini' | 'codex';
export type CliHookScope = 'project' | 'global';

export interface CliHook {
  id: string;
  projectId: string | null;
  provider: CliProvider;
  name: string;
  hookType: string;
  script: string;
  enabled: boolean;
  scope: CliHookScope;
  matcher?: string | null;  // Tool matcher pattern e.g. "Write|Edit|Bash"
  timeout?: number | null;  // Timeout in seconds
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CliSettings {
  id: string;
  projectId: string | null;
  provider: CliProvider;
  settings: Record<string, unknown>;
  scope: CliHookScope;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScannedHook {
  name: string;
  hookType: string;
  matcher?: string;
  filePath: string;
  inDb: boolean;
  inFs: boolean;
  differs: boolean | null;
  dbHookId?: string;
}

export interface ScanResult {
  hooks: ScannedHook[];
  total: number;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface DiffResult {
  dbContent: string;
  fsContent: string | null;
  differs: boolean;
}

export interface HookTemplate {
  name: string;
  description: string;
  hookType: string;
  script: string;
}

export interface TemplatesResponse {
  templates: HookTemplate[];
  hookTypes: string[];
}

export interface ProviderInfo {
  name: CliProvider;
  hookTypes: string[];
}

// Query params
interface ListHooksParams {
  projectId?: string;
  provider?: CliProvider;
  scope?: CliHookScope;
  enabled?: boolean;
}

interface ScanParams {
  provider: CliProvider;
  projectPath?: string;
  projectId?: string;
}

interface ImportParams {
  provider: CliProvider;
  projectPath?: string;
  projectId?: string;
  updateExisting?: boolean;
}

interface CreateHookData {
  projectId?: string | null;
  provider: CliProvider;
  name: string;
  hookType: string;
  script: string;
  enabled?: boolean;
  scope: CliHookScope;
  matcher?: string | null;
  timeout?: number | null;
}

interface UpdateHookData {
  name?: string;
  hookType?: string;
  script?: string;
  enabled?: boolean;
  matcher?: string | null;
  timeout?: number | null;
}

/**
 * CLI Hooks API methods
 */
export const cliHooksApi = {
  // === Hooks CRUD ===

  /** List hooks with optional filters */
  list: (params?: ListHooksParams) =>
    apiClient.get<{ hooks: CliHook[]; total: number }>('/api/cli-hooks', params as Record<string, string | number | boolean | undefined>),

  /** Get single hook by ID */
  get: (id: string) =>
    apiClient.get<{ hook: CliHook }>(`/api/cli-hooks/${id}`).then((r) => r.hook),

  /** Create new hook */
  create: (data: CreateHookData) =>
    apiClient.post<{ hook: CliHook }>('/api/cli-hooks', data).then((r) => r.hook),

  /** Update hook */
  update: (id: string, data: UpdateHookData) =>
    apiClient.patch<{ hook: CliHook }>(`/api/cli-hooks/${id}`, data).then((r) => r.hook),

  /** Delete hook */
  delete: (id: string) =>
    apiClient.delete<void>(`/api/cli-hooks/${id}`),

  // === Sync Operations ===

  /** Sync single hook to filesystem */
  sync: (id: string) =>
    apiClient.post<{ synced: boolean; conflict?: boolean; message?: string }>(
      `/api/cli-hooks/${id}/sync`
    ),

  /** Sync all hooks for project/global */
  syncAll: (projectId?: string) =>
    apiClient.post<{ synced: number; failed: number }>(
      '/api/cli-hooks/sync-all',
      { projectId }
    ),

  // === Templates ===

  /** Get templates and hook types for provider */
  getTemplates: (provider: CliProvider) =>
    apiClient.get<TemplatesResponse>(`/api/cli-hooks/templates/${provider}`),

  // === Filesystem Scan/Import (NEW) ===

  /** Scan filesystem for hooks - preview before import */
  scan: (params: ScanParams) =>
    apiClient.get<ScanResult>('/api/cli-hooks/scan', params as unknown as Record<string, string | undefined>),

  /** Import hooks from filesystem to DB */
  import: (data: ImportParams) =>
    apiClient.post<ImportResult>('/api/cli-hooks/import', data),

  /** Get diff between DB and filesystem for collision resolution */
  getDiff: (id: string) =>
    apiClient.get<DiffResult>(`/api/cli-hooks/diff/${id}`),

  // === Settings ===

  /** Get settings for provider */
  getSettings: (provider: CliProvider, projectId?: string) =>
    apiClient.get<CliSettings>(`/api/cli-settings/${provider}`, { projectId }),

  /** Save settings */
  saveSettings: (data: { provider: CliProvider; projectId?: string; settings: Record<string, unknown> }) =>
    apiClient.post<CliSettings>('/api/cli-settings', data),

  /** Sync settings to filesystem */
  syncSettings: (provider: CliProvider, projectId?: string) =>
    apiClient.post<{ success: boolean }>(`/api/cli-settings/${provider}/sync`, { projectId }),

  // === Metadata ===

  /** Get list of providers with their hook types */
  getProviders: () =>
    apiClient.get<{ providers: ProviderInfo[] }>('/api/cli-providers'),
};
