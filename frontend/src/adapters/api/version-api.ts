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
  deploymentMode: 'npm' | 'electron';
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  downloadSize?: number;
  checkFailed?: boolean;
  checkError?: string;
}

export interface UpdateInstructions {
  npx: string;
  npmUpdate: string;
  npmInstall: string;
  electron: string;
  deploymentMode: 'npm' | 'electron';
  recommended: string;
}

export interface CurrentVersionInfo {
  version: string;
  node: string;
  platform: string;
  arch: string;
  deploymentMode: 'npm' | 'electron';
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
