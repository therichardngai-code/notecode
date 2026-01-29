/**
 * SQLite Project Repository
 * Implements IProjectRepository using Drizzle ORM
 */

import { eq, like, desc, and } from 'drizzle-orm';
import { IProjectRepository, ProjectFilters } from '../../domain/ports/repositories/project.repository.port.js';
import { Project, ApprovalGateConfig } from '../../domain/entities/project.entity.js';
import { projects, ProjectRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteProjectRepository implements IProjectRepository {
  async findById(id: string): Promise<Project | null> {
    const db = getDatabase();
    const row = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByPath(path: string): Promise<Project | null> {
    const db = getDatabase();
    const row = await db.query.projects.findFirst({
      where: eq(projects.path, path),
    });
    return row ? this.toEntity(row) : null;
  }

  async findAll(filters?: ProjectFilters): Promise<Project[]> {
    const db = getDatabase();
    const conditions = [];

    if (filters?.isFavorite !== undefined) {
      conditions.push(eq(projects.isFavorite, filters.isFavorite));
    }
    if (filters?.search) {
      conditions.push(like(projects.name, `%${filters.search}%`));
    }

    const rows = await db.query.projects.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(projects.lastAccessedAt)],
    });

    return rows.map(row => this.toEntity(row));
  }

  async findRecent(limit: number = 10): Promise<Project[]> {
    const db = getDatabase();
    const rows = await db.query.projects.findMany({
      orderBy: [desc(projects.lastAccessedAt)],
      limit,
    });
    return rows.map(row => this.toEntity(row));
  }

  async findFavorites(): Promise<Project[]> {
    const db = getDatabase();
    const rows = await db.query.projects.findMany({
      where: eq(projects.isFavorite, true),
      orderBy: [desc(projects.lastAccessedAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(project: Project): Promise<Project> {
    const db = getDatabase();
    const data = this.toRow(project);

    await db.insert(projects).values(data).onConflictDoUpdate({
      target: projects.id,
      set: {
        name: data.name,
        path: data.path,
        systemPrompt: data.systemPrompt,
        approvalGate: data.approvalGate,
        isFavorite: data.isFavorite,
        lastAccessedAt: data.lastAccessedAt,
      },
    });

    return project;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.changes > 0;
  }

  async exists(path: string): Promise<boolean> {
    const db = getDatabase();
    const row = await db.query.projects.findFirst({
      where: eq(projects.path, path),
      columns: { id: true },
    });
    return row !== undefined;
  }

  private toEntity(row: ProjectRow): Project {
    return new Project(
      row.id,
      row.name,
      row.path,
      row.systemPrompt ?? null,
      row.approvalGate ? JSON.parse(row.approvalGate) as ApprovalGateConfig : null,
      row.isFavorite ?? false,
      row.lastAccessedAt ? new Date(row.lastAccessedAt) : null,
      new Date(row.createdAt!)
    );
  }

  private toRow(project: Project): typeof projects.$inferInsert {
    return {
      id: project.id,
      name: project.name,
      path: project.path,
      systemPrompt: project.systemPrompt,
      approvalGate: project.approvalGate ? JSON.stringify(project.approvalGate) : null,
      isFavorite: project.isFavorite,
      lastAccessedAt: project.lastAccessedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
    };
  }
}
