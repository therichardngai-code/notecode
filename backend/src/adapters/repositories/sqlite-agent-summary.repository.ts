/**
 * SQLite Agent Summary Repository
 * Stores and retrieves agent session summaries
 */

import { eq, desc } from 'drizzle-orm';
import { IAgentSummaryRepository } from '../../domain/ports/repositories/agent-summary.repository.port.js';
import { ExtractedAgentSummary } from '../../domain/entities/agent-summary.entity.js';
import { agentSummaries } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteAgentSummaryRepository implements IAgentSummaryRepository {
  async findByAgentId(agentId: string, limit: number = 5): Promise<ExtractedAgentSummary[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(agentSummaries)
      .where(eq(agentSummaries.agentId, agentId))
      .orderBy(desc(agentSummaries.createdAt))
      .limit(limit);

    return rows.map(row => this.toEntity(row));
  }

  async save(summary: ExtractedAgentSummary): Promise<ExtractedAgentSummary> {
    const db = getDatabase();
    const data = {
      id: summary.id,
      agentId: summary.agentId,
      sessionId: summary.sessionId,
      summary: summary.summary,
      keyDecisions: JSON.stringify(summary.keyDecisions),
      filesModified: JSON.stringify(summary.filesModified),
      tokenCount: summary.tokenCount,
      extractedAt: summary.extractedAt.toISOString(),
      createdAt: summary.createdAt.toISOString(),
    };

    await db.insert(agentSummaries).values(data).onConflictDoNothing();
    return summary;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(agentSummaries).where(eq(agentSummaries.id, id));
    return (result.changes ?? 0) > 0;
  }

  private toEntity(row: typeof agentSummaries.$inferSelect): ExtractedAgentSummary {
    return new ExtractedAgentSummary(
      row.id,
      row.agentId,
      row.sessionId,
      row.summary,
      JSON.parse(row.keyDecisions ?? '[]'),
      JSON.parse(row.filesModified ?? '[]'),
      row.tokenCount ?? 0,
      row.extractedAt ? new Date(row.extractedAt) : new Date(),
      row.createdAt ? new Date(row.createdAt) : new Date()
    );
  }
}
