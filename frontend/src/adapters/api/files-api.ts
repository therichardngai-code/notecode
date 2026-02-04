/**
 * Files API Client
 * Handles file system operations for projects
 */

import { apiClient } from './api-client';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
  hasChildren?: boolean; // true = folder has children but not loaded yet
}

export interface GetTreeOptions {
  depth?: number;    // Depth to load (1 = immediate children only)
  showAll?: boolean; // Skip .gitignore (true = show all files)
}

export interface FileTreeResponse {
  tree: FileNode;
}

export interface FileContentResponse {
  content: string;
  path: string;
  size: number;
  encoding: string;
}

/**
 * Files API methods
 */
export const filesApi = {
  /**
   * Get file tree for project with lazy loading support
   * @param projectId - Project ID
   * @param path - Root path (optional, defaults to '/')
   * @param options - depth (1 for immediate children), showAll (skip gitignore)
   */
  getTree: (projectId: string, path = '/', options?: GetTreeOptions) =>
    apiClient.get<FileTreeResponse>(
      `/api/projects/${projectId}/files/tree`,
      {
        path,
        ...(options?.depth !== undefined && { depth: options.depth }),
        ...(options?.showAll && { showAll: 'true' }),
      }
    ),

  /**
   * Read file content
   * @param projectId - Project ID
   * @param path - File path relative to project root
   */
  readFile: (projectId: string, path: string) =>
    apiClient.get<FileContentResponse>(
      `/api/projects/${projectId}/files/content`,
      { path }
    ),

  /**
   * Save file content
   * @param projectId - Project ID
   * @param path - File path relative to project root
   * @param content - New file content
   */
  saveFile: (projectId: string, path: string, content: string) =>
    apiClient.put<{ success: boolean; path: string; size: number }>(
      `/api/projects/${projectId}/files/content`,
      { path, content }
    ),
};
