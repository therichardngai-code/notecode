/**
 * Ignore Patterns Service
 * Handles .gitignore and custom ignore patterns
 */

import fs from 'fs/promises';
import path from 'path';
import ignore, { Ignore } from 'ignore';

export const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.env',
  '.env.*',
  'dist/**',
  'build/**',
  '*.log',
  '.DS_Store',
  '__pycache__/**',
  '*.pyc',
  '.pytest_cache/**',
  '.next/**',
  '.nuxt/**',
  'coverage/**',
  '.vscode/**',
  '.idea/**',
  '*.swp',
  '*.swo',
  '.cache/**',
  'tmp/**',
  'temp/**',
];

export class IgnorePatternsService {
  /**
   * Load ignore patterns from .gitignore, .notecode-ignore, and defaults
   */
  async loadPatterns(projectPath: string): Promise<Ignore> {
    const ig = ignore();

    // Add default patterns
    ig.add(DEFAULT_IGNORE_PATTERNS);

    // Try to load .gitignore
    try {
      const gitignorePath = path.join(projectPath, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch (error) {
      // .gitignore not found or not readable - continue without it
    }

    // Try to load .notecode-ignore (custom)
    try {
      const customIgnorePath = path.join(projectPath, '.notecode-ignore');
      const customContent = await fs.readFile(customIgnorePath, 'utf-8');
      ig.add(customContent);
    } catch (error) {
      // Custom ignore not found - continue without it
    }

    return ig;
  }

  /**
   * Check if path should be ignored
   */
  shouldIgnore(ig: Ignore, relativePath: string): boolean {
    // Normalize path separators
    const normalized = relativePath.replace(/\\/g, '/');
    return ig.ignores(normalized);
  }
}
