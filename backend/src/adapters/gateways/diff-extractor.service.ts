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

export interface BashToolInput {
  command: string;
  description?: string;
}

export interface ToolUseEvent {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Pending operation stored before tool_result confirmation
 * Used to defer diff creation until tool execution succeeds
 */
export interface PendingOperation {
  sessionId: string;
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  createdAt: Date;
}

export class DiffExtractorService {
  /** Cache of pending tool operations awaiting confirmation */
  private pendingOperations = new Map<string, PendingOperation>();

  constructor(private diffRepo: IDiffRepository) {}

  // ============ PENDING OPERATIONS (tool_use → tool_result flow) ============

  /**
   * Store tool_use event as pending (don't create diff yet)
   * Called when tool_use event received, before tool execution
   */
  storePendingOperation(sessionId: string, event: ToolUseEvent): void {
    // Only store file operations that create diffs
    if (!['Edit', 'Write', 'Bash'].includes(event.name)) return;

    this.pendingOperations.set(event.id, {
      sessionId,
      toolUseId: event.id,
      toolName: event.name,
      input: event.input,
      createdAt: new Date()
    });

    console.log(`[DiffExtractor] Stored pending operation ${event.id} (${event.name})`);
  }

  /**
   * Confirm pending operation and create diff
   * Called when tool_result success received
   * @returns Created diff or null if not a file operation
   */
  async confirmOperation(toolUseId: string): Promise<Diff | null> {
    const pending = this.pendingOperations.get(toolUseId);
    if (!pending) {
      console.log(`[DiffExtractor] No pending operation for ${toolUseId}`);
      return null;
    }

    this.pendingOperations.delete(toolUseId);

    // Create diff from pending operation
    const diff = this.extractFromToolUse(pending.sessionId, {
      id: pending.toolUseId,
      name: pending.toolName,
      input: pending.input
    });

    if (diff) {
      await this.diffRepo.save(diff);
      console.log(`[DiffExtractor] Confirmed and saved diff ${diff.id} for ${diff.filePath}`);
    }

    return diff;
  }

  /**
   * Discard pending operation without creating diff
   * Called when tool_result fails or hook rejects
   * @returns true if operation was discarded
   */
  discardOperation(toolUseId: string): boolean {
    const existed = this.pendingOperations.delete(toolUseId);
    if (existed) {
      console.log(`[DiffExtractor] Discarded pending operation ${toolUseId}`);
    }
    return existed;
  }

  /**
   * Cleanup orphaned pending operations older than maxAgeMs
   * Called periodically or on session end
   * @param maxAgeMs Maximum age in milliseconds (default 5 minutes)
   * @returns Number of operations cleaned up
   */
  cleanupOrphanedPending(maxAgeMs: number = 5 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleaned = 0;

    for (const [id, op] of this.pendingOperations) {
      if (op.createdAt.getTime() < cutoff) {
        this.pendingOperations.delete(id);
        cleaned++;
        console.log(`[DiffExtractor] Cleaned up orphaned pending ${id} (${op.toolName})`);
      }
    }

    if (cleaned > 0) {
      console.log(`[DiffExtractor] Cleaned up ${cleaned} orphaned pending operations`);
    }

    return cleaned;
  }

  /**
   * Check if there are pending operations for a session
   */
  hasPendingOperations(sessionId: string): boolean {
    for (const op of this.pendingOperations.values()) {
      if (op.sessionId === sessionId) return true;
    }
    return false;
  }

  // ============ DIFF EXTRACTION ============

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
      case 'Bash':
        return this.createBashDiff(sessionId, id, input as unknown as BashToolInput);
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
   * Extract diff from Bash command (best-effort detection of file operations)
   * Patterns: echo/cat > file, rm file, mv file, cp file
   */
  private createBashDiff(
    sessionId: string,
    toolUseId: string,
    input: BashToolInput
  ): Diff | null {
    const cmd = input.command;

    // Pattern: echo "content" > file or cat > file (write/create)
    const writeMatch = cmd.match(/(?:echo|cat|printf)\s+(?:["']([^"']+)["']|([^>]+))\s*>\s*["']?([^\s"']+)["']?/);
    if (writeMatch) {
      const content = writeMatch[1] || writeMatch[2] || '';
      const filePath = writeMatch[3];
      return Diff.createWrite(randomUUID(), sessionId, toolUseId, filePath, content.trim());
    }

    // Pattern: rm file (delete) - track but can't revert
    const rmMatch = cmd.match(/\brm\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/);
    if (rmMatch) {
      const filePath = rmMatch[1];
      return Diff.createDelete(randomUUID(), sessionId, toolUseId, filePath);
    }

    // Pattern: mv oldfile newfile (rename/move) - track as delete old
    const mvMatch = cmd.match(/\bmv\s+["']?([^\s"']+)["']?\s+["']?([^\s"']+)["']?/);
    if (mvMatch) {
      const oldPath = mvMatch[1];
      // Track as delete (source file removed)
      return Diff.createDelete(randomUUID(), sessionId, toolUseId, oldPath);
    }

    // No file operation detected
    return null;
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
