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
   * Get file tree for project
   * @param projectId - Project ID
   * @param path - Root path (optional, defaults to '/')
   */
  getTree: (projectId: string, path = '/') =>
    apiClient.get<FileTreeResponse>(
      `/api/projects/${projectId}/files/tree`,
      { path }
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
};
