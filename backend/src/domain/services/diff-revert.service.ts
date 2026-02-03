/**
 * Diff Revert Service
 * Handles reverting file changes when diffs are rejected (single or batch)
 */

import { promises as fs } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import { IDiffRepository } from '../ports/repositories/diff.repository.port.js';

export interface RevertResult {
  diffId: string;
  success: boolean;
  message: string;
  filePath: string;
  operation: 'restored' | 'deleted' | 'skipped';
}

export interface BatchRevertResult {
  success: boolean;
  total: number;
  reverted: number;
  failed: number;
  results: RevertResult[];
}

export class DiffRevertService {
  constructor(private diffRepo: IDiffRepository) {}

  /**
   * Revert a single diff - restore file to previous state
   */
  async revertDiff(diffId: string, workingDir: string): Promise<RevertResult> {
    const diff = await this.diffRepo.findById(diffId);
    if (!diff) {
      return { diffId, success: false, message: 'Diff not found', filePath: '', operation: 'skipped' };
    }

    if (diff.status === 'rejected') {
      return { diffId, success: true, message: 'Already rejected', filePath: diff.filePath, operation: 'skipped' };
    }

    // Use filePath directly if absolute, otherwise join with workingDir
    const fullPath = isAbsolute(diff.filePath) ? diff.filePath : join(workingDir, diff.filePath);

    try {
      switch (diff.operation) {
        case 'edit':
          if (!diff.oldContent) {
            return { diffId, success: false, message: 'No oldContent to restore', filePath: diff.filePath, operation: 'skipped' };
          }
          await this.restoreFileContent(fullPath, diff.oldContent, diff.newContent);
          break;

        case 'write':
          await this.deleteFileIfExists(fullPath);
          break;

        case 'delete':
          return { diffId, success: false, message: 'Cannot revert delete operation', filePath: diff.filePath, operation: 'skipped' };
      }

      diff.reject();
      await this.diffRepo.save(diff);

      return {
        diffId,
        success: true,
        message: `File ${diff.operation === 'write' ? 'deleted' : 'restored'}`,
        filePath: diff.filePath,
        operation: diff.operation === 'write' ? 'deleted' : 'restored'
      };
    } catch (error) {
      return {
        diffId,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        filePath: diff.filePath,
        operation: 'skipped'
      };
    }
  }

  /**
   * Batch revert all diffs for a session (for commit rejection)
   */
  async revertAllSessionDiffs(sessionId: string, workingDir: string): Promise<BatchRevertResult> {
    const diffs = await this.diffRepo.findBySessionId(sessionId);
    const pendingDiffs = diffs.filter(d => d.status === 'pending' || d.status === 'approved');

    if (pendingDiffs.length === 0) {
      return { success: true, total: 0, reverted: 0, failed: 0, results: [] };
    }

    // Revert in reverse order (last change first)
    const sortedDiffs = pendingDiffs.sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    const results: RevertResult[] = [];
    let reverted = 0;
    let failed = 0;

    for (const diff of sortedDiffs) {
      const result = await this.revertDiff(diff.id, workingDir);
      results.push(result);
      if (result.success && result.operation !== 'skipped') reverted++;
      else if (!result.success) failed++;
    }

    return {
      success: failed === 0,
      total: sortedDiffs.length,
      reverted,
      failed,
      results
    };
  }

  /**
   * Batch approve all diffs for a session (for commit approval)
   */
  async approveAllSessionDiffs(sessionId: string): Promise<{ approved: number }> {
    const diffs = await this.diffRepo.findBySessionId(sessionId);
    const pendingDiffs = diffs.filter(d => d.status === 'pending');

    for (const diff of pendingDiffs) {
      diff.approve();
      await this.diffRepo.save(diff);
    }

    return { approved: pendingDiffs.length };
  }

  /**
   * Mark all diffs as applied after commit
   */
  async markAllApplied(sessionId: string): Promise<number> {
    const diffs = await this.diffRepo.findBySessionId(sessionId);
    const approvedDiffs = diffs.filter(d => d.status === 'approved');

    for (const diff of approvedDiffs) {
      diff.markApplied();
      await this.diffRepo.save(diff);
    }

    return approvedDiffs.length;
  }

  /**
   * Clear content from diff (keep metadata for audit)
   * Called after diff is applied to free storage
   */
  async clearDiffContent(diffId: string): Promise<void> {
    await this.diffRepo.clearContent(diffId);
  }

  /**
   * Clear content from all applied diffs in session
   */
  async clearAppliedContent(sessionId: string): Promise<number> {
    const diffs = await this.diffRepo.findBySessionId(sessionId);
    const applied = diffs.filter(d => d.status === 'applied');

    for (const diff of applied) {
      await this.diffRepo.clearContent(diff.id);
    }

    return applied.length;
  }

  /**
   * Restore file by replacing newContent with oldContent
   */
  private async restoreFileContent(
    filePath: string,
    oldContent: string,
    newContent: string | null
  ): Promise<void> {
    try {
      const currentContent = await fs.readFile(filePath, 'utf-8');

      if (newContent && currentContent.includes(newContent)) {
        // Simple case: replace newContent with oldContent
        const restored = currentContent.replace(newContent, oldContent);
        await fs.writeFile(filePath, restored, 'utf-8');
      } else {
        // Best-effort restore - write oldContent directly
        await fs.writeFile(filePath, oldContent, 'utf-8');
      }
    } catch {
      // File might not exist, create with oldContent
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, oldContent, 'utf-8');
    }
  }

  /**
   * Delete file if it exists
   */
  private async deleteFileIfExists(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }
}
