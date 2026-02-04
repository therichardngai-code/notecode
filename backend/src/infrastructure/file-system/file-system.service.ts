/**
 * File System Service
 * Main service for file operations with security and caching
 */

import fs from 'fs/promises';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { PathValidator, PathTraversalError } from './path-validator.js';
import { IgnorePatternsService } from './ignore-patterns.service.js';
import { FileTreeBuilder, FileLimitExceededError } from './file-tree-builder.js';
import type { FileNode, FileContent, FileTreeOptions, ReadFileOptions } from '../../domain/entities/file-node.entity.js';

export class BinaryFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BinaryFileError';
  }
}

export class FileTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileTooLargeError';
  }
}

export const FILE_SYSTEM_CONFIG = {
  MAX_DEPTH: 10,
  MAX_FILES: 50000, // Increased from 10k (node_modules can be large)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  CACHE_MAX_SIZE: 100,
};

export class FileSystemService {
  private ignoreService: IgnorePatternsService;
  private cache: LRUCache<string, FileNode>;

  constructor() {
    this.ignoreService = new IgnorePatternsService();
    this.cache = new LRUCache<string, FileNode>({
      max: FILE_SYSTEM_CONFIG.CACHE_MAX_SIZE,
      ttl: FILE_SYSTEM_CONFIG.CACHE_TTL,
    });
  }

  /**
   * Build file tree for project
   */
  async buildFileTree(
    projectPath: string,
    options: FileTreeOptions = {}
  ): Promise<FileNode> {
    const {
      maxDepth = FILE_SYSTEM_CONFIG.MAX_DEPTH,
      maxFiles = FILE_SYSTEM_CONFIG.MAX_FILES,
      relativePath = '/',
      loadDepth,
      skipIgnore = false,
    } = options;

    // Validate and resolve paths
    const resolvedProjectPath = path.resolve(projectPath);
    const targetPath = PathValidator.validate(resolvedProjectPath, relativePath);

    // Check cache (include loadDepth and skipIgnore in key)
    const cacheKey = `tree:${targetPath}:${maxDepth}:${maxFiles}:${loadDepth}:${skipIgnore}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Verify path exists and is directory
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    // Load ignore patterns
    const ignorePatterns = await this.ignoreService.loadPatterns(resolvedProjectPath);

    // Build tree with lazy loading support
    const builder = new FileTreeBuilder(maxDepth, maxFiles);
    const tree = await builder.buildTree(
      targetPath,
      resolvedProjectPath,
      ignorePatterns,
      0, // start at depth 0
      { loadDepth, skipIgnore }
    );

    // Cache result
    this.cache.set(cacheKey, tree);

    return tree;
  }

  /**
   * Read file content with encoding detection
   */
  async readFileContent(
    projectPath: string,
    relativePath: string,
    options: ReadFileOptions = {}
  ): Promise<FileContent> {
    const {
      maxSize = FILE_SYSTEM_CONFIG.MAX_FILE_SIZE,
      encoding = 'utf-8',
    } = options;

    // Validate paths
    const resolvedProjectPath = path.resolve(projectPath);
    const filePath = PathValidator.validate(resolvedProjectPath, relativePath);

    // Check file exists and get stats
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    // Check file size
    if (stats.size > maxSize) {
      throw new FileTooLargeError(`File exceeds maximum size (${maxSize} bytes)`);
    }

    // Check if binary
    if (await this.isBinaryFile(filePath)) {
      throw new BinaryFileError('Binary files are not supported');
    }

    // Read file content
    const content = await fs.readFile(filePath, encoding);

    return {
      content,
      path: relativePath,
      size: stats.size,
      encoding,
    };
  }

  /**
   * Detect if file is binary
   */
  private async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      // Read first 8KB
      const buffer = Buffer.alloc(8192);
      const fd = await fs.open(filePath, 'r');
      const { bytesRead } = await fd.read(buffer, 0, 8192, 0);
      await fd.close();

      // Check for null bytes (indicator of binary)
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If we can't read, assume binary to be safe
      return true;
    }
  }

  /**
   * Clear cache (for testing or manual invalidation)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export all errors for controller
export { PathTraversalError, FileLimitExceededError };
