/**
 * Approval Entity
 * Represents a tool approval request with lifecycle and decision tracking
 */

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
}

export type ApprovalType = 'diff' | 'tool' | 'command';
export type ToolCategory = 'safe' | 'requires-approval' | 'dangerous';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface ApprovalPayload {
  type: ApprovalType;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId?: string; // For deduplication of parallel hooks
  filePath?: string;
  hunks?: DiffHunk[];
  matchedPattern?: string; // The pattern that triggered dangerous category
  matchType?: 'command' | 'file'; // What type of pattern matched
}

export class Approval {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly messageId: string | null,
    public readonly type: ApprovalType,
    public readonly payload: ApprovalPayload,
    public readonly toolCategory: ToolCategory,
    public status: ApprovalStatus,
    public readonly timeoutAt: Date,
    public readonly autoAction: 'approve' | 'deny',
    public decidedAt: Date | null,
    public decidedBy: string | null,
    public readonly createdAt: Date
  ) {}

  static create(
    id: string,
    sessionId: string,
    type: ApprovalType,
    payload: ApprovalPayload,
    toolCategory: ToolCategory,
    timeoutSeconds: number,
    autoAction: 'approve' | 'deny',
    messageId: string | null = null
  ): Approval {
    const now = new Date();
    const timeoutAt = new Date(now.getTime() + timeoutSeconds * 1000);

    return new Approval(
      id,
      sessionId,
      messageId,
      type,
      payload,
      toolCategory,
      ApprovalStatus.PENDING,
      timeoutAt,
      autoAction,
      null,
      null,
      now
    );
  }

  isPending(): boolean {
    return this.status === ApprovalStatus.PENDING;
  }

  isExpired(): boolean {
    return this.isPending() && new Date() > this.timeoutAt;
  }

  approve(decidedBy: string): void {
    if (!this.isPending()) {
      throw new Error('Approval is not pending');
    }
    this.status = ApprovalStatus.APPROVED;
    this.decidedAt = new Date();
    this.decidedBy = decidedBy;
  }

  reject(decidedBy: string): void {
    if (!this.isPending()) {
      throw new Error('Approval is not pending');
    }
    this.status = ApprovalStatus.REJECTED;
    this.decidedAt = new Date();
    this.decidedBy = decidedBy;
  }

  timeout(): void {
    if (!this.isPending()) return;
    this.status = ApprovalStatus.TIMEOUT;
    this.decidedAt = new Date();
  }

  get remainingTimeMs(): number {
    if (!this.isPending()) return 0;
    return Math.max(0, this.timeoutAt.getTime() - Date.now());
  }
}
