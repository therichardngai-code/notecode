/**
 * File Node Entity
 * Represents a file or directory in the file tree
 */

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
  /** Hint for lazy loading: true = folder has children but not loaded yet */
  hasChildren?: boolean;
}

export interface FileContent {
  content: string;
  path: string;
  size: number;
  encoding: string;
}

export interface FileTreeOptions {
  maxDepth?: number;
  maxFiles?: number;
  relativePath?: string;
  /** Depth to load (1 = immediate children only, for lazy loading) */
  loadDepth?: number;
  /** Skip ignore patterns (show all files including node_modules) */
  skipIgnore?: boolean;
}

export interface ReadFileOptions {
  maxSize?: number;
  encoding?: BufferEncoding;
}
