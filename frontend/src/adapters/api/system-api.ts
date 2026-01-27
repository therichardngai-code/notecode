/**
 * System API
 * HTTP client for system-level operations (folder picker, etc.)
 */

import { apiClient } from './api-client';

// Platform info
export interface PlatformInfo {
  platform: string;
  supported: boolean;
  method: string;
  isElectron: boolean;
}

// Request types
export interface SelectFolderRequest {
  title?: string;
  initialPath?: string;
}

// Response types
export interface SelectFolderResponse {
  path: string | null;
  name: string | null;
  cancelled: boolean;
  error?: string;
  platform?: string;
}

export interface ValidatePathResponse {
  exists: boolean;
  isDirectory: boolean;
  name: string | null;
  absolutePath: string | null;
}

/**
 * System API methods
 */
export const systemApi = {
  /** Get platform info and folder picker support */
  getPlatform: () =>
    apiClient.get<PlatformInfo>('/api/system/platform'),

  /** Open native folder picker dialog */
  selectFolder: (options?: SelectFolderRequest) =>
    apiClient.post<SelectFolderResponse>('/api/system/select-folder', options || {}),

  /** Validate if path exists and is directory */
  validatePath: (path: string) =>
    apiClient.post<ValidatePathResponse>('/api/system/validate-path', { path }),
};
