/**
 * Diff Entity
 * Represents a file change diff with hunks and status tracking
 */

export type DiffOperation = 'edit' | 'write' | 'delete';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}
export type DiffStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface DiffBlock {
  id: string;
  sessionId: string;
  messageId: string | null;
  toolUseId: string;
  approvalId: string | null;
  filePath: string;
  operation: DiffOperation;
  oldContent: string | null;
  newContent: string | null;
  fullContent: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  hunks: DiffHunk[];
  status: DiffStatus;
  appliedAt: Date | null;
  createdAt: Date;
}

export class Diff implements DiffBlock {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public messageId: string | null,
    public readonly toolUseId: string,
    public approvalId: string | null,
    public readonly filePath: string,
    public readonly operation: DiffOperation,
    public readonly oldContent: string | null,
    public readonly newContent: string | null,
    public readonly fullContent: string | null,
    public readonly lineStart: number | null,
    public readonly lineEnd: number | null,
    public hunks: DiffHunk[],
    public status: DiffStatus,
    public appliedAt: Date | null,
    public readonly createdAt: Date
  ) {}

  static createEdit(
    id: string,
    sessionId: string,
    toolUseId: string,
    filePath: string,
    oldContent: string,
    newContent: string,
    hunks: DiffHunk[]
  ): Diff {
    return new Diff(
      id,
      sessionId,
      null,
      toolUseId,
      null,
      filePath,
      'edit',
      oldContent,
      newContent,
      null,
      null,
      null,
      hunks,
      'pending',
      null,
      new Date()
    );
  }

  static createWrite(
    id: string,
    sessionId: string,
    toolUseId: string,
    filePath: string,
    content: string
  ): Diff {
    const lines = content.split('\n');
    const hunks: DiffHunk[] = [{
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: lines.length,
      content,
    }];

    return new Diff(
      id,
      sessionId,
      null,
      toolUseId,
      null,
      filePath,
      'write',
      null,
      null,
      content,
      1,
      lines.length,
      hunks,
      'pending',
      null,
      new Date()
    );
  }

  static createDelete(
    id: string,
    sessionId: string,
    toolUseId: string,
    filePath: string
  ): Diff {
    return new Diff(
      id,
      sessionId,
      null,
      toolUseId,
      null,
      filePath,
      'delete',
      null,
      null,
      null,
      null,
      null,
      [],
      'pending',
      null,
      new Date()
    );
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  linkToApproval(approvalId: string): void {
    this.approvalId = approvalId;
  }

  linkToMessage(messageId: string): void {
    this.messageId = messageId;
  }

  approve(): void {
    if (this.status !== 'pending') {
      throw new Error('Diff is not pending');
    }
    this.status = 'approved';
  }

  reject(): void {
    if (this.status !== 'pending') {
      throw new Error('Diff is not pending');
    }
    this.status = 'rejected';
  }

  markApplied(): void {
    if (this.status !== 'approved') {
      throw new Error('Diff must be approved before applying');
    }
    this.status = 'applied';
    this.appliedAt = new Date();
  }

  get addedLines(): number {
    return this.hunks.reduce((sum, h) => sum + h.newLines, 0);
  }

  get removedLines(): number {
    return this.hunks.reduce((sum, h) => sum + h.oldLines, 0);
  }
}

