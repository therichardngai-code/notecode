/**
 * SQLite Session Repository
 * Implements ISessionRepository using Drizzle ORM
 */

import { eq, desc, inArray } from 'drizzle-orm';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { Session } from '../../domain/entities/session.entity.js';
import { SessionStatus, ProviderType } from '../../domain/value-objects/task-status.vo.js';
import {
  TokenUsage,
  ModelUsage,
  ToolStats,
  createEmptyToolStats,
} from '../../domain/value-objects/token-usage.vo.js';
import { sessions, SessionRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteSessionRepository implements ISessionRepository {
  async findById(id: string): Promise<Session | null> {
    const db = getDatabase();
    const row = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByTaskId(taskId: string): Promise<Session[]> {
    const db = getDatabase();
    const rows = await db.query.sessions.findMany({
      where: eq(sessions.taskId, taskId),
      orderBy: [desc(sessions.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByAgentId(agentId: string): Promise<Session[]> {
    const db = getDatabase();
    const rows = await db.query.sessions.findMany({
      where: eq(sessions.agentId, agentId),
      orderBy: [desc(sessions.createdAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findRunning(): Promise<Session[]> {
    const db = getDatabase();
    const rows = await db.query.sessions.findMany({
      where: inArray(sessions.status, [SessionStatus.RUNNING, SessionStatus.PAUSED]),
      orderBy: [desc(sessions.startedAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findRecent(limit: number = 10): Promise<Session[]> {
    const db = getDatabase();
    const rows = await db.query.sessions.findMany({
      orderBy: [desc(sessions.createdAt)],
      limit,
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(session: Session): Promise<Session> {
    const db = getDatabase();
    const data = this.toRow(session);

    await db.insert(sessions).values(data).onConflictDoUpdate({
      target: sessions.id,
      set: {
        ...data,
        updatedAt: new Date().toISOString(),
      },
    });

    return session;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return result.changes > 0;
  }

  private toEntity(row: SessionRow): Session {
    const tokenUsage: TokenUsage = {
      input: row.tokenInput ?? 0,
      output: row.tokenOutput ?? 0,
      cacheRead: row.tokenCacheRead ?? 0,
      cacheCreation: row.tokenCacheCreation ?? 0,
      total: row.tokenTotal ?? 0,
      estimatedCostUsd: row.estimatedCostUsd ?? 0,
    };

    const modelUsage: ModelUsage[] = row.modelUsage
      ? JSON.parse(row.modelUsage)
      : [];

    const toolStats: ToolStats = row.toolStats
      ? JSON.parse(row.toolStats)
      : createEmptyToolStats();

    return new Session(
      row.id,
      row.taskId,
      row.agentId ?? null,
      row.parentSessionId ?? null,
      row.providerSessionId ?? null,
      row.name ?? '',
      row.status as SessionStatus,
      row.provider as ProviderType | null,
      row.processId ?? null,
      row.workingDir ?? '',
      row.startedAt ? new Date(row.startedAt) : null,
      row.endedAt ? new Date(row.endedAt) : null,
      row.durationMs ?? null,
      tokenUsage,
      modelUsage,
      toolStats,
      new Date(row.createdAt!),
      new Date(row.updatedAt!)
    );
  }

  private toRow(session: Session): typeof sessions.$inferInsert {
    return {
      id: session.id,
      taskId: session.taskId,
      agentId: session.agentId,
      parentSessionId: session.parentSessionId,
      providerSessionId: session.providerSessionId,
      name: session.name,
      status: session.status,
      provider: session.provider,
      processId: session.processId,
      workingDir: session.workingDir,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      durationMs: session.durationMs,
      tokenInput: session.tokenUsage.input,
      tokenOutput: session.tokenUsage.output,
      tokenCacheRead: session.tokenUsage.cacheRead,
      tokenCacheCreation: session.tokenUsage.cacheCreation,
      tokenTotal: session.tokenUsage.total,
      estimatedCostUsd: session.tokenUsage.estimatedCostUsd,
      modelUsage: JSON.stringify(session.modelUsage),
      toolStats: JSON.stringify(session.toolStats),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
