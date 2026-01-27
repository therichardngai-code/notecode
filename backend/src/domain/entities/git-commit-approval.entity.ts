/**
 * Git Commit Approval Entity
 * Represents a pending/resolved commit approval for task changes
 */

export interface DiffSummary {
  files: number;
  additions: number;
  deletions: number;
}

export type GitApprovalStatus = 'pending' | 'approved' | 'rejected';

export class GitCommitApproval {
  constructor(
    public readonly id: string,
    public readonly taskId: string,
    public readonly projectId: string,
    public readonly attemptNumber: number,
    public status: GitApprovalStatus,
    public commitMessage: string,
    public filesChanged: string[],
    public diffSummary: DiffSummary,
    public commitSha: string | null,
    public readonly createdAt: Date,
    public resolvedAt: Date | null,
    public pushedAt: Date | null
  ) {}

  /**
   * Approve the commit and record the SHA
   */
  approve(commitSha: string): void {
    if (this.status !== 'pending') {
      throw new Error('Approval already resolved');
    }
    this.status = 'approved';
    this.commitSha = commitSha;
    this.resolvedAt = new Date();
  }

  /**
   * Reject the commit
   */
  reject(): void {
    if (this.status !== 'pending') {
      throw new Error('Approval already resolved');
    }
    this.status = 'rejected';
    this.resolvedAt = new Date();
  }

  /**
   * Update commit message before approval
   */
  updateCommitMessage(message: string): void {
    if (this.status !== 'pending') {
      throw new Error('Cannot update resolved approval');
    }
    this.commitMessage = message;
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isApproved(): boolean {
    return this.status === 'approved';
  }

  isRejected(): boolean {
    return this.status === 'rejected';
  }

  /**
   * Mark the commit as pushed (future feature)
   */
  markPushed(): void {
    if (this.status !== 'approved') {
      throw new Error('Can only mark approved commits as pushed');
    }
    this.pushedAt = new Date();
  }

  isPushed(): boolean {
    return this.pushedAt !== null;
  }
}
