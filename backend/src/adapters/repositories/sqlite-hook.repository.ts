/**
 * SQLite Hook Repository
 * Implements IHookRepository using Drizzle ORM
 */

import { eq, and } from 'drizzle-orm';
import { IHookRepository, HookQueryFilters } from '../../domain/ports/repositories/hook.repository.port.js';
import {
  Hook,
  HookEvent,
  HookType,
  HookConfig,
  HookFilters,
} from '../../domain/entities/hook.entity.js';
import { hooks, HookRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteHookRepository implements IHookRepository {
  async findById(id: string): Promise<Hook | null> {
    const db = getDatabase();
    const row = await db.query.hooks.findFirst({
      where: eq(hooks.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByProjectId(projectId: string): Promise<Hook[]> {
    const db = getDatabase();
    const rows = await db.query.hooks.findMany({
      where: eq(hooks.projectId, projectId),
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByTaskId(taskId: string): Promise<Hook[]> {
    const db = getDatabase();
    const rows = await db.query.hooks.findMany({
      where: eq(hooks.taskId, taskId),
    });
    return rows.map(row => this.toEntity(row));
  }

  async findByEvent(event: HookEvent, projectId?: string, taskId?: string): Promise<Hook[]> {
    const db = getDatabase();
    const conditions = [eq(hooks.event, event), eq(hooks.enabled, true)];

    if (projectId) {
      conditions.push(eq(hooks.projectId, projectId));
    }
    if (taskId) {
      conditions.push(eq(hooks.taskId, taskId));
    }

    const rows = await db.query.hooks.findMany({
      where: and(...conditions),
    });
    return rows.map(row => this.toEntity(row));
  }

  async findEnabled(filters?: HookQueryFilters): Promise<Hook[]> {
    return this.findAll({ ...filters, enabled: true });
  }

  async findAll(filters?: HookQueryFilters): Promise<Hook[]> {
    const db = getDatabase();
    const conditions = [];

    if (filters?.projectId) {
      conditions.push(eq(hooks.projectId, filters.projectId));
    }
    if (filters?.taskId) {
      conditions.push(eq(hooks.taskId, filters.taskId));
    }
    if (filters?.event) {
      conditions.push(eq(hooks.event, filters.event));
    }
    if (filters?.enabled !== undefined) {
      conditions.push(eq(hooks.enabled, filters.enabled));
    }

    const rows = await db.query.hooks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(hook: Hook): Promise<Hook> {
    const db = getDatabase();
    const data = this.toRow(hook);

    await db.insert(hooks).values(data).onConflictDoUpdate({
      target: hooks.id,
      set: {
        name: data.name,
        event: data.event,
        type: data.type,
        config: data.config,
        filters: data.filters,
        enabled: data.enabled,
        priority: data.priority,
        updatedAt: data.updatedAt,
      },
    });

    return hook;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(hooks).where(eq(hooks.id, id));
    return result.changes > 0;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const db = getDatabase();
    const result = await db.delete(hooks).where(eq(hooks.projectId, projectId));
    return result.changes;
  }

  async deleteByTaskId(taskId: string): Promise<number> {
    const db = getDatabase();
    const result = await db.delete(hooks).where(eq(hooks.taskId, taskId));
    return result.changes;
  }

  private toEntity(row: HookRow): Hook {
    const config: HookConfig = JSON.parse(row.config);
    const filters: HookFilters | null = row.filters ? JSON.parse(row.filters) : null;

    return new Hook(
      row.id,
      row.projectId ?? null,
      row.taskId ?? null,
      row.name,
      row.event as HookEvent,
      row.type as HookType,
      config,
      filters,
      row.enabled ?? true,
      row.priority ?? 0,
      new Date(row.createdAt!),
      new Date(row.updatedAt!)
    );
  }

  private toRow(hook: Hook): typeof hooks.$inferInsert {
    return {
      id: hook.id,
      projectId: hook.projectId,
      taskId: hook.taskId,
      name: hook.name,
      event: hook.event,
      type: hook.type,
      config: JSON.stringify(hook.config),
      filters: hook.filters ? JSON.stringify(hook.filters) : null,
      enabled: hook.enabled,
      priority: hook.priority,
      createdAt: hook.createdAt.toISOString(),
      updatedAt: hook.updatedAt.toISOString(),
    };
  }
}
