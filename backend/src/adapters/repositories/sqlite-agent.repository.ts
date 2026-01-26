/**
 * SQLite Agent Repository
 * Implements IAgentRepository using Drizzle ORM
 */

import { eq, like, desc, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { IAgentRepository, AgentFilters } from '../../domain/ports/repositories/agent.repository.port.js';
import { Agent, AgentToolConfig, AgentSummary } from '../../domain/entities/agent.entity.js';
import { AgentRole } from '../../domain/value-objects/task-status.vo.js';
import { agents, agentSummaries, AgentRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteAgentRepository implements IAgentRepository {
  async findById(id: string): Promise<Agent | null> {
    const db = getDatabase();
    const row = await db.query.agents.findFirst({
      where: eq(agents.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByProjectId(projectId: string): Promise<Agent[]> {
    const db = getDatabase();
    const rows = await db.query.agents.findMany({
      where: eq(agents.projectId, projectId),
      orderBy: [desc(agents.updatedAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async findAll(filters?: AgentFilters): Promise<Agent[]> {
    const db = getDatabase();
    const conditions = [];

    if (filters?.projectId) {
      conditions.push(eq(agents.projectId, filters.projectId));
    }
    if (filters?.role) {
      conditions.push(eq(agents.role, filters.role));
    }
    if (filters?.search) {
      conditions.push(like(agents.name, `%${filters.search}%`));
    }

    const rows = await db.query.agents.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(agents.updatedAt)],
    });

    return rows.map(row => this.toEntity(row));
  }

  async save(agent: Agent): Promise<Agent> {
    const db = getDatabase();
    const data = this.toRow(agent);

    await db.insert(agents).values(data).onConflictDoUpdate({
      target: agents.id,
      set: {
        ...data,
        updatedAt: new Date().toISOString(),
      },
    });

    return agent;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(agents).where(eq(agents.id, id));
    return result.changes > 0;
  }

  async getSummaries(agentId: string, limit: number = 5): Promise<AgentSummary[]> {
    const db = getDatabase();
    const rows = await db.query.agentSummaries.findMany({
      where: eq(agentSummaries.agentId, agentId),
      orderBy: [desc(agentSummaries.createdAt)],
      limit,
    });

    return rows.map(row => ({
      sessionId: row.sessionId,
      summary: row.summary,
      createdAt: new Date(row.createdAt!),
    }));
  }

  async saveSummary(agentId: string, sessionId: string, summary: string): Promise<void> {
    const db = getDatabase();
    await db.insert(agentSummaries).values({
      id: randomUUID(),
      agentId,
      sessionId,
      summary,
      createdAt: new Date().toISOString(),
    });
  }

  private toEntity(row: AgentRow): Agent {
    return new Agent(
      row.id,
      row.projectId ?? null,
      row.name,
      row.role as AgentRole,
      row.description ?? null,
      row.focusAreas ? JSON.parse(row.focusAreas) : [],
      row.defaultSkills ? JSON.parse(row.defaultSkills) : [],
      row.defaultTools ? JSON.parse(row.defaultTools) as AgentToolConfig : null,
      row.injectPreviousSummaries ?? true,
      row.maxSummariesToInject ?? 5,
      row.totalSessions ?? 0,
      row.totalTokensUsed ?? 0,
      new Date(row.createdAt!),
      new Date(row.updatedAt!)
    );
  }

  private toRow(agent: Agent): typeof agents.$inferInsert {
    return {
      id: agent.id,
      projectId: agent.projectId,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      focusAreas: JSON.stringify(agent.focusAreas),
      defaultSkills: JSON.stringify(agent.defaultSkills),
      defaultTools: agent.defaultTools ? JSON.stringify(agent.defaultTools) : null,
      injectPreviousSummaries: agent.injectPreviousSummaries,
      maxSummariesToInject: agent.maxSummariesToInject,
      totalSessions: agent.totalSessions,
      totalTokensUsed: agent.totalTokensUsed,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };
  }
}
