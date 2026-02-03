/**
 * SQLite Diff Repository
 * Implements IDiffRepository using Drizzle ORM
 */

import { eq, and, asc } from 'drizzle-orm';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';
import { Diff, DiffOperation, DiffStatus, DiffHunk } from '../../domain/entities/diff.entity.js';
import { diffs, sessions, DiffRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteDiffRepository implements IDiffRepository {
  async findById(id: string): Promise<Diff | null> {
    const db = getDatabase();
    const row = await db.query.diffs.findFirst({
      where: eq(diffs.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findBySessionId(sessionId: string): Promise<Diff[]> {
    const db = getDatabase();
    const rows = await db.query.diffs.findMany({
      where: eq(diffs.sessionId, sessionId),
      orderBy: [asc(diffs.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByTaskId(taskId: string): Promise<Diff[]> {
    const db = getDatabase();
    // JOIN diffs with sessions to get all diffs for a task
    const rows = await db
      .select({
        id: diffs.id,
        sessionId: diffs.sessionId,
        messageId: diffs.messageId,
        toolUseId: diffs.toolUseId,
        approvalId: diffs.approvalId,
        filePath: diffs.filePath,
        operation: diffs.operation,
        oldContent: diffs.oldContent,
        newContent: diffs.newContent,
        fullContent: diffs.fullContent,
        lineStart: diffs.lineStart,
        lineEnd: diffs.lineEnd,
        hunks: diffs.hunks,
        status: diffs.status,
        appliedAt: diffs.appliedAt,
        createdAt: diffs.createdAt,
      })
      .from(diffs)
      .innerJoin(sessions, eq(diffs.sessionId, sessions.id))
      .where(eq(sessions.taskId, taskId))
      .orderBy(asc(diffs.createdAt));

    return rows.map(row => this.toEntity(row as DiffRow));
  }

  async findByApprovalId(approvalId: string): Promise<Diff[]> {
    const db = getDatabase();
    const rows = await db.query.diffs.findMany({
      where: eq(diffs.approvalId, approvalId),
      orderBy: [asc(diffs.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByToolUseId(toolUseId: string): Promise<Diff | null> {
    const db = getDatabase();
    const row = await db.query.diffs.findFirst({
      where: eq(diffs.toolUseId, toolUseId),
    });
    return row ? this.toEntity(row) : null;
  }

  async findPending(): Promise<Diff[]> {
    const db = getDatabase();
    const rows = await db.query.diffs.findMany({
      where: eq(diffs.status, 'pending'),
      orderBy: [asc(diffs.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByFilePath(sessionId: string, filePath: string): Promise<Diff[]> {
    const db = getDatabase();
    const rows = await db.query.diffs.findMany({
      where: and(
        eq(diffs.sessionId, sessionId),
        eq(diffs.filePath, filePath)
      ),
      orderBy: [asc(diffs.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(diff: Diff): Promise<Diff> {
    const db = getDatabase();
    const data = this.toRow(diff);

    await db.insert(diffs).values(data).onConflictDoUpdate({
      target: diffs.id,
      set: {
        messageId: data.messageId,
        approvalId: data.approvalId,
        status: data.status,
        appliedAt: data.appliedAt,
      },
    });

    return diff;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(diffs).where(eq(diffs.id, id));
    return result.changes > 0;
  }

  async findByStatus(status: DiffStatus): Promise<Diff[]> {
    const db = getDatabase();
    const rows = await db.query.diffs.findMany({
      where: eq(diffs.status, status),
      orderBy: [asc(diffs.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async clearContent(id: string): Promise<void> {
    const db = getDatabase();
    await db.update(diffs)
      .set({
        oldContent: null,
        newContent: null,
        fullContent: null,
      })
      .where(eq(diffs.id, id));
  }

  private toEntity(row: DiffRow): Diff {
    const hunks: DiffHunk[] = row.hunks ? JSON.parse(row.hunks) : [];

    return new Diff(
      row.id,
      row.sessionId,
      row.messageId ?? null,
      row.toolUseId,
      row.approvalId ?? null,
      row.filePath,
      row.operation as DiffOperation,
      row.oldContent ?? null,
      row.newContent ?? null,
      row.fullContent ?? null,
      row.lineStart ?? null,
      row.lineEnd ?? null,
      hunks,
      (row.status ?? 'pending') as DiffStatus,
      row.appliedAt ? new Date(row.appliedAt) : null,
      new Date(row.createdAt!)
    );
  }

  private toRow(diff: Diff): typeof diffs.$inferInsert {
    return {
      id: diff.id,
      sessionId: diff.sessionId,
      messageId: diff.messageId,
      toolUseId: diff.toolUseId,
      approvalId: diff.approvalId,
      filePath: diff.filePath,
      operation: diff.operation,
      oldContent: diff.oldContent,
      newContent: diff.newContent,
      fullContent: diff.fullContent,
      lineStart: diff.lineStart,
      lineEnd: diff.lineEnd,
      hunks: JSON.stringify(diff.hunks),
      status: diff.status,
      appliedAt: diff.appliedAt?.toISOString() ?? null,
      createdAt: diff.createdAt.toISOString(),
    };
  }
}
