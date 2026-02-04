/**
 * Orphan Cleanup Service
 * Auto-cleanup orphaned diffs and approvals after 24h TTL
 * Prevents storage bloat and stale state
 */

import { IGitApprovalRepository } from '../../adapters/repositories/sqlite-git-approval.repository.js';
import { IDiffRepository } from '../ports/repositories/diff.repository.port.js';
import { ISessionRepository } from '../ports/repositories/session.repository.port.js';
import { DiffRevertService } from './diff-revert.service.js';

/** 24 hours in milliseconds */
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  approvalsExpired: number;
  diffsReverted: number;
  contentCleared: number;
}

export class OrphanCleanupService {
  constructor(
    private gitApprovalRepo: IGitApprovalRepository,
    private diffRepo: IDiffRepository,
    private sessionRepo: ISessionRepository,
    private diffRevertService: DiffRevertService
  ) {}

  /**
   * Run cleanup job - call this on schedule (every hour)
   * 1. Find stale pending approvals > 24h → auto-reject + revert
   * 2. Clear content from applied diffs → free storage
   */
  async runCleanup(): Promise<CleanupResult> {
    const cutoff = new Date(Date.now() - ORPHAN_TTL_MS);
    let approvalsExpired = 0;
    let diffsReverted = 0;
    let contentCleared = 0;

    // 1. Find stale pending approvals (> 24h)
    const staleApprovals = await this.gitApprovalRepo.findStalePending(cutoff);

    for (const approval of staleApprovals) {
      // Auto-reject and revert all diffs for this approval's session
      if (approval.sessionId) {
        const session = await this.sessionRepo.findById(approval.sessionId);
        if (session?.workingDir) {
          const result = await this.diffRevertService.revertAllSessionDiffs(
            approval.sessionId,
            session.workingDir
          );
          diffsReverted += result.reverted;
        }
      }

      // Mark as rejected (expired)
      approval.reject();
      await this.gitApprovalRepo.save(approval);
      approvalsExpired++;
    }

    // 2. Clear content from applied diffs (immediate cleanup)
    const appliedDiffs = await this.diffRepo.findByStatus('applied');
    for (const diff of appliedDiffs) {
      if (diff.oldContent || diff.newContent || diff.fullContent) {
        await this.diffRepo.clearContent(diff.id);
        contentCleared++;
      }
    }

    return { approvalsExpired, diffsReverted, contentCleared };
  }
}
