/**
 * Path Validator - Security-first path validation
 * Prevents directory traversal attacks
 */

import path from 'path';

export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

export class PathValidator {
  /**
   * Validate that requested path is within project bounds
   * Throws PathTraversalError if validation fails
   */
  static validate(basePath: string, requestedPath: string): string {
    // Resolve base path
    const base = path.resolve(basePath);

    // Handle root path case: '/' or empty should mean project root
    if (!requestedPath || requestedPath === '/' || requestedPath === '.') {
      return base;
    }

    // Strip leading slash to treat as relative (not absolute)
    const normalized = requestedPath.startsWith('/')
      ? requestedPath.slice(1)
      : requestedPath;

    // Resolve to absolute path
    const resolved = path.resolve(base, normalized);

    // Check if resolved path is within base
    // Use path.sep to ensure proper separator handling
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new PathTraversalError(`Path outside project bounds: ${requestedPath}`);
    }

    return resolved;
  }

  /**
   * Check for common malicious patterns in path
   */
  static containsMaliciousPattern(filePath: string): boolean {
    const dangerous = [
      '../',
      '..\\',
      '%2e%2e',
      '%2e.',
      '.%2e',
      'etc/passwd',
      'etc/shadow',
      '.ssh/',
      'windows/system32',
    ];

    const normalized = filePath.toLowerCase().replace(/\\/g, '/');
    return dangerous.some(pattern => normalized.includes(pattern));
  }

  /**
   * Normalize path for cross-platform compatibility
   */
  static normalize(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }
}
