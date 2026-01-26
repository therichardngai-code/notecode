/**
 * SQLite Approval Repository
 * Implements IApprovalRepository using Drizzle ORM
 */

import { eq, and, lt } from 'drizzle-orm';
import { IApprovalRepository } from '../../domain/ports/repositories/approval.repository.port.js';
import {
  Approval,
  ApprovalStatus,
  ApprovalType,
  ToolCategory,
  ApprovalPayload,
} from '../../domain/entities/approval.entity.js';
import { approvals, ApprovalRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteApprovalRepository implements IApprovalRepository {
  async findById(id: string): Promise<Approval | null> {
    const db = getDatabase();
    const row = await db.query.approvals.findFirst({
      where: eq(approvals.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findBySessionId(sessionId: string): Promise<Approval[]> {
    const db = getDatabase();
    const rows = await db.query.approvals.findMany({
      where: eq(approvals.sessionId, sessionId),
    });
    return rows.map(row => this.toEntity(row));
  }

  async findPending(): Promise<Approval[]> {
    const db = getDatabase();
    const rows = await db.query.approvals.findMany({
      where: eq(approvals.status, ApprovalStatus.PENDING),
    });
    return rows.map(row => this.toEntity(row));
  }

  async findPendingBySessionId(sessionId: string): Promise<Approval[]> {
    const db = getDatabase();
    const rows = await db.query.approvals.findMany({
      where: and(
        eq(approvals.sessionId, sessionId),
        eq(approvals.status, ApprovalStatus.PENDING)
      ),
    });
    return rows.map(row => this.toEntity(row));
  }

  async findExpired(): Promise<Approval[]> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const rows = await db.query.approvals.findMany({
      where: and(
        eq(approvals.status, ApprovalStatus.PENDING),
        lt(approvals.timeoutAt, now)
      ),
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(approval: Approval): Promise<Approval> {
    const db = getDatabase();
    const data = this.toRow(approval);

    await db.insert(approvals).values(data).onConflictDoUpdate({
      target: approvals.id,
      set: {
        status: data.status,
        decidedAt: data.decidedAt,
        decidedBy: data.decidedBy,
      },
    });

    return approval;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(approvals).where(eq(approvals.id, id));
    return result.changes > 0;
  }

  private toEntity(row: ApprovalRow): Approval {
    const payload: ApprovalPayload = JSON.parse(row.payload);

    return new Approval(
      row.id,
      row.sessionId,
      row.messageId ?? null,
      row.type as ApprovalType,
      payload,
      (row.toolCategory ?? 'requires-approval') as ToolCategory,
      (row.status ?? ApprovalStatus.PENDING) as ApprovalStatus,
      new Date(row.timeoutAt),
      (row.autoAction ?? 'deny') as 'approve' | 'deny',
      row.decidedAt ? new Date(row.decidedAt) : null,
      row.decidedBy ?? null,
      new Date(row.createdAt!)
    );
  }

  private toRow(approval: Approval): typeof approvals.$inferInsert {
    return {
      id: approval.id,
      sessionId: approval.sessionId,
      messageId: approval.messageId,
      type: approval.type,
      payload: JSON.stringify(approval.payload),
      toolCategory: approval.toolCategory,
      status: approval.status,
      timeoutAt: approval.timeoutAt.toISOString(),
      autoAction: approval.autoAction,
      decidedAt: approval.decidedAt?.toISOString() ?? null,
      decidedBy: approval.decidedBy,
      createdAt: approval.createdAt.toISOString(),
    };
  }
}
