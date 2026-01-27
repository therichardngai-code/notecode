/**
 * Version API
 * HTTP client for version check and update endpoints
 */

import { apiClient } from './api-client';

// Types
export interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  releaseNotes?: string;
  publishedAt?: string;
}

export interface UpdateInstructions {
  npx: string;
  npmUpdate: string;
  npmInstall: string;
  electron: string;
}

export interface CurrentVersionInfo {
  version: string;
  node: string;
  platform: string;
}

/**
 * Version API methods
 */
export const versionApi = {
  /** Check for updates (cached for 24h unless refresh=true) */
  checkForUpdates: (refresh = false) =>
    apiClient.get<VersionInfo>('/api/version/check', { refresh: refresh ? 'true' : undefined }),

  /** Get update instructions for specific version */
  getUpdateInstructions: (version?: string) =>
    apiClient.get<UpdateInstructions>('/api/version/instructions', { version }),

  /** Get current version info */
  getCurrentVersion: () =>
    apiClient.get<CurrentVersionInfo>('/api/version/current'),
};
