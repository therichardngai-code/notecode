/**
 * SQLite Task Repository
 * Implements ITaskRepository using Drizzle ORM
 */

import { eq, and, inArray, like, desc } from 'drizzle-orm';
import { ITaskRepository, TaskFilters } from '../../domain/ports/repositories/task.repository.port.js';
import { Task, ToolConfig } from '../../domain/entities/task.entity.js';
import {
  TaskStatus,
  TaskPriority,
  AgentRole,
  ProviderType,
} from '../../domain/value-objects/task-status.vo.js';
import { tasks, TaskRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteTaskRepository implements ITaskRepository {
  async findById(id: string): Promise<Task | null> {
    const db = getDatabase();
    const row = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByProjectId(projectId: string, filters?: TaskFilters): Promise<Task[]> {
    const db = getDatabase();
    const conditions = [eq(tasks.projectId, projectId)];

    if (filters?.status?.length) {
      conditions.push(inArray(tasks.status, filters.status));
    }
    if (filters?.priority?.length) {
      conditions.push(inArray(tasks.priority, filters.priority));
    }
    if (filters?.search) {
      conditions.push(like(tasks.title, `%${filters.search}%`));
    }
    if (filters?.agentId) {
      conditions.push(eq(tasks.agentId, filters.agentId));
    }

    const rows = await db.query.tasks.findMany({
      where: and(...conditions),
      orderBy: [desc(tasks.updatedAt)],
    });

    return rows.map(row => this.toEntity(row));
  }

  async findByAgentId(agentId: string): Promise<Task[]> {
    const db = getDatabase();
    const rows = await db.query.tasks.findMany({
      where: eq(tasks.agentId, agentId),
      orderBy: [desc(tasks.updatedAt)],
    });
    return rows.map(row => this.toEntity(row));
  }

  async save(task: Task): Promise<Task> {
    const db = getDatabase();
    const data = this.toRow(task);

    await db.insert(tasks).values(data).onConflictDoUpdate({
      target: tasks.id,
      set: {
        ...data,
        updatedAt: new Date().toISOString(),
      },
    });

    return task;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.changes > 0;
  }

  async countByStatus(projectId: string): Promise<Record<TaskStatus, number>> {
    const db = getDatabase();
    const rows = await db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      columns: { status: true },
    });

    const counts = {} as Record<TaskStatus, number>;
    for (const status of Object.values(TaskStatus)) {
      counts[status] = 0;
    }
    for (const row of rows) {
      const status = row.status as TaskStatus;
      if (status in counts) {
        counts[status]++;
      }
    }
    return counts;
  }

  private toEntity(row: TaskRow): Task {
    return new Task(
      row.id,
      row.projectId,
      row.agentId ?? null,
      row.parentId ?? null,
      row.dependencies ? JSON.parse(row.dependencies) : [],
      row.title,
      row.description ?? '',
      row.status as TaskStatus,
      row.priority as TaskPriority,
      row.assignee ?? null,
      row.dueDate ? new Date(row.dueDate) : null,
      row.agentRole as AgentRole | null,
      row.provider as ProviderType | null,
      row.model ?? null,
      row.skills ? JSON.parse(row.skills) : [],
      row.tools ? JSON.parse(row.tools) as ToolConfig : null,
      row.contextFiles ? JSON.parse(row.contextFiles) : [],
      row.workflowStage ?? null,
      row.subagentDelegates ?? false,
      // Git config
      row.autoBranch ?? false,
      row.autoCommit ?? false,
      row.branchName ?? null,
      row.baseBranch ?? null,
      row.branchCreatedAt ? new Date(row.branchCreatedAt) : null,
      row.permissionMode as Task['permissionMode'] ?? null,
      // Attempt tracking
      row.totalAttempts ?? 0,
      row.renewCount ?? 0,
      row.retryCount ?? 0,
      row.forkCount ?? 0,
      row.lastAttemptAt ? new Date(row.lastAttemptAt) : null,
      new Date(row.createdAt!),
      new Date(row.updatedAt!),
      row.startedAt ? new Date(row.startedAt) : null,
      row.completedAt ? new Date(row.completedAt) : null
    );
  }

  private toRow(task: Task): typeof tasks.$inferInsert {
    return {
      id: task.id,
      projectId: task.projectId,
      agentId: task.agentId,
      parentId: task.parentId,
      dependencies: JSON.stringify(task.dependencies),
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate?.toISOString() ?? null,
      agentRole: task.agentRole,
      provider: task.provider,
      model: task.model,
      skills: JSON.stringify(task.skills),
      tools: task.tools ? JSON.stringify(task.tools) : null,
      contextFiles: JSON.stringify(task.contextFiles),
      workflowStage: task.workflowStage,
      subagentDelegates: task.subagentDelegates,
      // Git config
      autoBranch: task.autoBranch,
      autoCommit: task.autoCommit,
      branchName: task.branchName,
      baseBranch: task.baseBranch,
      branchCreatedAt: task.branchCreatedAt?.toISOString() ?? null,
      permissionMode: task.permissionMode,
      // Attempt tracking
      totalAttempts: task.totalAttempts,
      renewCount: task.renewCount,
      retryCount: task.retryCount,
      forkCount: task.forkCount,
      lastAttemptAt: task.lastAttemptAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      startedAt: task.startedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
    };
  }
}
