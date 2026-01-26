/**
 * SQLite Audit Log Repository
 * Implements IAuditLogRepository using Drizzle ORM
 */

import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import {
  IAuditLogRepository,
  AuditLogEntry,
  AuditEntityType,
  AuditAction,
} from '../../domain/ports/repositories/audit-log.repository.port.js';
import { auditLogs, AuditLogRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteAuditLogRepository implements IAuditLogRepository {
  async log(
    entry: Omit<AuditLogEntry, 'id' | 'createdAt'>
  ): Promise<AuditLogEntry> {
    const db = getDatabase();
    const id = randomUUID();
    const createdAt = new Date();

    await db.insert(auditLogs).values({
      id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      performedBy: entry.performedBy,
      sessionId: entry.sessionId,
      createdAt: createdAt.toISOString(),
    });

    return {
      ...entry,
      id,
      createdAt,
    };
  }

  async findByEntity(
    entityType: AuditEntityType,
    entityId: string
  ): Promise<AuditLogEntry[]> {
    const db = getDatabase();
    const rows = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ),
      orderBy: [desc(auditLogs.createdAt)],
    });
    return rows.map(row => this.toEntry(row));
  }

  async findBySession(sessionId: string): Promise<AuditLogEntry[]> {
    const db = getDatabase();
    const rows = await db.query.auditLogs.findMany({
      where: eq(auditLogs.sessionId, sessionId),
      orderBy: [desc(auditLogs.createdAt)],
    });
    return rows.map(row => this.toEntry(row));
  }

  async findRecent(limit: number = 100): Promise<AuditLogEntry[]> {
    const db = getDatabase();
    const rows = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });
    return rows.map(row => this.toEntry(row));
  }

  private toEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      entityType: row.entityType as AuditEntityType,
      entityId: row.entityId,
      action: row.action as AuditAction,
      changes: row.changes ? JSON.parse(row.changes) : null,
      performedBy: row.performedBy ?? null,
      sessionId: row.sessionId ?? null,
      createdAt: new Date(row.createdAt!),
    };
  }
}
