/**
 * SQLite Git Commit Approval Repository
 * Implements persistence for git commit approvals
 */

import { eq, and, desc, lt } from 'drizzle-orm';
import {
  GitCommitApproval,
  GitApprovalStatus,
  DiffSummary,
} from '../../domain/entities/git-commit-approval.entity.js';
import {
  gitCommitApprovals,
  GitCommitApprovalRow,
} from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export interface IGitApprovalRepository {
  findById(id: string): Promise<GitCommitApproval | null>;
  findByTaskId(taskId: string): Promise<GitCommitApproval[]>;
  findByProjectId(projectId: string, status?: GitApprovalStatus): Promise<GitCommitApproval[]>;
  findPendingByTaskId(taskId: string): Promise<GitCommitApproval | null>;
  /** Find pending approvals created before cutoff date (for TTL cleanup) */
  findStalePending(cutoff: Date): Promise<GitCommitApproval[]>;
  countByTaskId(taskId: string): Promise<number>;
  save(approval: GitCommitApproval): Promise<GitCommitApproval>;
  delete(id: string): Promise<boolean>;
}

export class SqliteGitApprovalRepository implements IGitApprovalRepository {
  async findById(id: string): Promise<GitCommitApproval | null> {
    const db = getDatabase();
    const row = await db.query.gitCommitApprovals.findFirst({
      where: eq(gitCommitApprovals.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByTaskId(taskId: string): Promise<GitCommitApproval[]> {
    const db = getDatabase();
    const rows = await db.query.gitCommitApprovals.findMany({
      where: eq(gitCommitApprovals.taskId, taskId),
      orderBy: [desc(gitCommitApprovals.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByProjectId(projectId: string, status?: GitApprovalStatus): Promise<GitCommitApproval[]> {
    const db = getDatabase();
    const conditions = [eq(gitCommitApprovals.projectId, projectId)];

    if (status) {
      conditions.push(eq(gitCommitApprovals.status, status));
    }

    const rows = await db.query.gitCommitApprovals.findMany({
      where: and(...conditions),
      orderBy: [desc(gitCommitApprovals.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findPendingByTaskId(taskId: string): Promise<GitCommitApproval | null> {
    const db = getDatabase();
    const row = await db.query.gitCommitApprovals.findFirst({
      where: and(
        eq(gitCommitApprovals.taskId, taskId),
        eq(gitCommitApprovals.status, 'pending')
      ),
    });
    return row ? this.toEntity(row) : null;
  }

  async countByTaskId(taskId: string): Promise<number> {
    const db = getDatabase();
    const rows = await db.query.gitCommitApprovals.findMany({
      where: eq(gitCommitApprovals.taskId, taskId),
      columns: { id: true },
    });
    return rows.length;
  }

  async findStalePending(cutoff: Date): Promise<GitCommitApproval[]> {
    const db = getDatabase();
    const rows = await db.query.gitCommitApprovals.findMany({
      where: and(
        eq(gitCommitApprovals.status, 'pending'),
        lt(gitCommitApprovals.createdAt, cutoff.toISOString())
      ),
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(approval: GitCommitApproval): Promise<GitCommitApproval> {
    const db = getDatabase();
    const data = this.toRow(approval);

    await db.insert(gitCommitApprovals).values(data).onConflictDoUpdate({
      target: gitCommitApprovals.id,
      set: {
        status: data.status,
        commitMessage: data.commitMessage,
        commitSha: data.commitSha,
        resolvedAt: data.resolvedAt,
        pushedAt: data.pushedAt,
      },
    });

    return approval;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(gitCommitApprovals).where(eq(gitCommitApprovals.id, id));
    return result.changes > 0;
  }

  private toEntity(row: GitCommitApprovalRow): GitCommitApproval {
    return new GitCommitApproval(
      row.id,
      row.taskId,
      row.projectId,
      row.sessionId ?? null, // Link to session for batch diff operations
      row.attemptNumber ?? 1,
      row.status as GitApprovalStatus,
      row.commitMessage ?? '',
      row.filesChanged ? JSON.parse(row.filesChanged) : [],
      row.diffSummary ? JSON.parse(row.diffSummary) as DiffSummary : { files: 0, additions: 0, deletions: 0 },
      row.commitSha ?? null,
      new Date(row.createdAt),
      row.resolvedAt ? new Date(row.resolvedAt) : null,
      row.pushedAt ? new Date(row.pushedAt) : null
    );
  }

  private toRow(approval: GitCommitApproval): typeof gitCommitApprovals.$inferInsert {
    return {
      id: approval.id,
      taskId: approval.taskId,
      projectId: approval.projectId,
      sessionId: approval.sessionId, // Link to session for batch diff operations
      attemptNumber: approval.attemptNumber,
      status: approval.status,
      commitMessage: approval.commitMessage,
      filesChanged: JSON.stringify(approval.filesChanged),
      diffSummary: JSON.stringify(approval.diffSummary),
      commitSha: approval.commitSha,
      createdAt: approval.createdAt.toISOString(),
      resolvedAt: approval.resolvedAt?.toISOString() ?? null,
      pushedAt: approval.pushedAt?.toISOString() ?? null,
    };
  }
}
