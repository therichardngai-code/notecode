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

export class FileTreeBuilder {
  private fileCount = 0;
  private readonly maxDepth: number;
  private readonly maxFiles: number;

  constructor(maxDepth = 10, maxFiles = 10000) {
    this.maxDepth = maxDepth;
    this.maxFiles = maxFiles;
  }

  /**
   * Build file tree recursively
   */
  async buildTree(
    currentPath: string,
    projectRoot: string,
    ignorePatterns: Ignore,
    depth = 0
  ): Promise<FileNode> {
    // Check depth limit
    if (depth > this.maxDepth) {
      throw new FileLimitExceededError(`Maximum directory depth (${this.maxDepth}) exceeded`);
    }

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

      // Check ignore patterns
      if (ignorePatterns.ignores(entryRelativePath.replace(/\\/g, '/'))) {
        continue;
      }

      // Check file count limit
      if (this.fileCount >= this.maxFiles) {
        throw new FileLimitExceededError(`Maximum file count (${this.maxFiles}) exceeded`);
      }

      try {
        if (entry.isDirectory()) {
          // Recurse into directory
          const subTree = await this.buildTree(
            fullPath,
            projectRoot,
            ignorePatterns,
            depth + 1
          );
          children.push(subTree);
        } else if (entry.isFile()) {
          // Add file node
          const stats = await fs.stat(fullPath);
          children.push({
            name: entry.name,
            path: '/' + entryRelativePath.replace(/\\/g, '/'),
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
