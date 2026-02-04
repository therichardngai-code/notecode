/**
 * File Tree Builder
 * Recursively builds file tree structure with safety limits
 */

import fs from 'fs/promises';
import path from 'path';
import type { Ignore } from 'ignore';
import type { FileNode } from '../../domain/entities/file-node.entity.js';

export class FileLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileLimitExceededError';
  }
}

export interface TreeBuildOptions {
  /** Max depth to traverse (default: unlimited within maxDepth) */
  loadDepth?: number;
  /** Skip ignore patterns (show all files) */
  skipIgnore?: boolean;
}

export class FileTreeBuilder {
  private fileCount = 0;
  private readonly maxDepth: number;
  private readonly maxFiles: number;

  constructor(maxDepth = 10, maxFiles = 10000) {
    this.maxDepth = maxDepth;
    this.maxFiles = maxFiles;
  }

  /**
   * Build file tree recursively with lazy loading support
   * @param loadDepth - How many levels to load (1 = only immediate children)
   */
  async buildTree(
    currentPath: string,
    projectRoot: string,
    ignorePatterns: Ignore,
    depth = 0,
    options: TreeBuildOptions = {}
  ): Promise<FileNode> {
    const { loadDepth, skipIgnore = false } = options;

    // Check depth limit
    if (depth > this.maxDepth) {
      throw new FileLimitExceededError(`Maximum directory depth (${this.maxDepth}) exceeded`);
    }

    // Check if we've reached loadDepth limit (lazy loading)
    const atLoadLimit = loadDepth !== undefined && depth >= loadDepth;

    // Get relative path for ignore checking
    const relativePath = path.relative(projectRoot, currentPath);

    // Read directory
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Permission denied or not accessible
      throw new Error(`Cannot read directory: ${relativePath}`);
    }

    const children: FileNode[] = [];

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.relative(projectRoot, fullPath);
      const normalizedPath = entryRelativePath.replace(/\\/g, '/');

      // Check ignore patterns (skip if skipIgnore is true)
      if (!skipIgnore && ignorePatterns.ignores(normalizedPath)) {
        continue;
      }

      // Check file count limit
      if (this.fileCount >= this.maxFiles) {
        throw new FileLimitExceededError(`Maximum file count (${this.maxFiles}) exceeded`);
      }

      try {
        if (entry.isDirectory()) {
          if (atLoadLimit) {
            // At load depth limit - add folder stub without children (lazy load)
            children.push({
              name: entry.name,
              path: '/' + normalizedPath,
              type: 'directory',
              children: undefined, // undefined = not loaded yet (vs [] = empty folder)
              hasChildren: true,   // hint to frontend that folder can be expanded
            });
          } else {
            // Recurse into directory
            const subTree = await this.buildTree(
              fullPath,
              projectRoot,
              ignorePatterns,
              depth + 1,
              options // pass options through
            );
            children.push(subTree);
          }
        } else if (entry.isFile()) {
          // Add file node
          const stats = await fs.stat(fullPath);
          children.push({
            name: entry.name,
            path: '/' + normalizedPath,
            type: 'file',
            size: stats.size,
          });
          this.fileCount++;
        }
        // Skip symlinks, sockets, etc. for security
      } catch (error) {
        // Skip files we can't access
        continue;
      }
    }

    return {
      name: path.basename(currentPath),
      path: '/' + relativePath.replace(/\\/g, '/'),
      type: 'directory',
      children,
    };
  }

  /**
   * Get current file count
   */
  getFileCount(): number {
    return this.fileCount;
  }

  /**
   * Reset file count for new tree
   */
  reset(): void {
    this.fileCount = 0;
  }
}
