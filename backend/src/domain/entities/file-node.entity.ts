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
}

export interface ReadFileOptions {
  maxSize?: number;
  encoding?: BufferEncoding;
}
