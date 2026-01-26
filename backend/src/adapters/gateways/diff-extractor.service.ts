/**
 * Diff Extractor Service
 * Extracts and generates diffs from CLI tool operations
 */

import { createTwoFilesPatch } from 'diff';
import { randomUUID } from 'crypto';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';
import { Diff, DiffHunk, DiffStatus } from '../../domain/entities/diff.entity.js';

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export interface ToolUseEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export class DiffExtractorService {
  constructor(private diffRepo: IDiffRepository) {}

  /**
   * Extract diff from a tool_use event
   * Returns null if tool is not a file operation
   */
  extractFromToolUse(sessionId: string, event: ToolUseEvent): Diff | null {
    const { id, name, input } = event;

    switch (name) {
      case 'Edit':
        return this.createEditDiff(sessionId, id, input as unknown as EditToolInput);
      case 'Write':
        return this.createWriteDiff(sessionId, id, input as unknown as WriteToolInput);
      default:
        return null;
    }
  }

  private createEditDiff(
    sessionId: string,
    toolUseId: string,
    input: EditToolInput
  ): Diff {
    const hunks = this.generateHunks(input.old_string, input.new_string);

    return Diff.createEdit(
      randomUUID(),
      sessionId,
      toolUseId,
      input.file_path,
      input.old_string,
      input.new_string,
      hunks
    );
  }

  private createWriteDiff(
    sessionId: string,
    toolUseId: string,
    input: WriteToolInput
  ): Diff {
    return Diff.createWrite(
      randomUUID(),
      sessionId,
      toolUseId,
      input.file_path,
      input.content
    );
  }

  /**
   * Generate unified diff hunks from old and new content
   */
  private generateHunks(oldStr: string, newStr: string): DiffHunk[] {
    const patch = createTwoFilesPatch('old', 'new', oldStr, newStr, '', '', {
      context: 3,
    });
    return this.parseUnifiedDiff(patch);
  }

  /**
   * Parse unified diff format into structured hunks
   */
  private parseUnifiedDiff(patch: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = patch.split('\n');

    let currentHunk: DiffHunk | null = null;
    let contentLines: string[] = [];

    for (const line of lines) {
      // Match hunk header: @@ -1,3 +1,4 @@
      const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);

      if (hunkMatch) {
        // Save previous hunk
        if (currentHunk) {
          currentHunk.content = contentLines.join('\n');
          hunks.push(currentHunk);
        }

        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: parseInt(hunkMatch[2] || '1', 10),
          newStart: parseInt(hunkMatch[3], 10),
          newLines: parseInt(hunkMatch[4] || '1', 10),
          content: '',
        };
        contentLines = [];
      } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        contentLines.push(line);
      }
    }

    // Save last hunk
    if (currentHunk) {
      currentHunk.content = contentLines.join('\n');
      hunks.push(currentHunk);
    }

    return hunks;
  }

  /**
   * Save diff to repository
   */
  async saveDiff(diff: Diff): Promise<Diff> {
    return this.diffRepo.save(diff);
  }

  /**
   * Link a diff to an approval record
   */
  async linkToApproval(diffId: string, approvalId: string): Promise<void> {
    const diff = await this.diffRepo.findById(diffId);
    if (diff) {
      diff.linkToApproval(approvalId);
      await this.diffRepo.save(diff);
    }
  }

  /**
   * Update diff status
   */
  async updateStatus(diffId: string, status: DiffStatus): Promise<void> {
    const diff = await this.diffRepo.findById(diffId);
    if (diff) {
      switch (status) {
        case 'approved':
          diff.approve();
          break;
        case 'rejected':
          diff.reject();
          break;
        case 'applied':
          diff.markApplied();
          break;
        default:
          // 'pending' - no change needed
          break;
      }
      await this.diffRepo.save(diff);
    }
  }

  /**
   * Get diffs for a session
   */
  async getSessionDiffs(sessionId: string): Promise<Diff[]> {
    return this.diffRepo.findBySessionId(sessionId);
  }

  /**
   * Get diffs for an approval
   */
  async getApprovalDiffs(approvalId: string): Promise<Diff[]> {
    return this.diffRepo.findByApprovalId(approvalId);
  }
}
