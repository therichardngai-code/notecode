/**
 * Export Data Use Case
 * Exports projects, tasks, sessions, and messages to JSON format
 */

import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { IMessageRepository } from '../../domain/ports/repositories/message.repository.port.js';

export interface ExportOptions {
  includeProjects?: boolean;
  includeTasks?: boolean;
  includeSessions?: boolean;
  includeMessages?: boolean;
  projectIds?: string[];
  dateRange?: { from: Date; to: Date };
}

export interface ExportData {
  exportedAt: string;
  version: string;
  projects?: unknown[];
  tasks?: unknown[];
  sessions?: unknown[];
  messages?: unknown[];
}

export interface ExportResult {
  success: boolean;
  data?: ExportData;
  error?: string;
}

export class ExportDataUseCase {
  constructor(
    private projectRepo: IProjectRepository,
    private taskRepo: ITaskRepository,
    private sessionRepo: ISessionRepository,
    private messageRepo: IMessageRepository
  ) {}

  async execute(options: ExportOptions = {}): Promise<ExportResult> {
    const data: ExportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    try {
      // Export projects
      if (options.includeProjects !== false) {
        if (options.projectIds?.length) {
          const projects = await Promise.all(
            options.projectIds.map(id => this.projectRepo.findById(id))
          );
          data.projects = projects.filter(Boolean);
        } else {
          data.projects = await this.projectRepo.findAll();
        }
      }

      // Export tasks (requires projectIds since there's no findAll)
      if (options.includeTasks !== false) {
        if (options.projectIds?.length) {
          const allTasks = [];
          for (const projectId of options.projectIds) {
            const tasks = await this.taskRepo.findByProjectId(projectId);
            allTasks.push(...tasks);
          }
          data.tasks = allTasks;
        } else if (data.projects) {
          // Get tasks from all exported projects
          const allTasks = [];
          for (const project of data.projects as { id: string }[]) {
            const tasks = await this.taskRepo.findByProjectId(project.id);
            allTasks.push(...tasks);
          }
          data.tasks = allTasks;
        }
      }

      // Export sessions (use findRecent with high limit)
      if (options.includeSessions) {
        const sessions = await this.sessionRepo.findRecent(10000);

        // Filter by date range if specified
        if (options.dateRange) {
          data.sessions = sessions.filter((s: { createdAt: Date | string }) => {
            const created = new Date(s.createdAt);
            return created >= options.dateRange!.from && created <= options.dateRange!.to;
          });
        } else {
          data.sessions = sessions;
        }
      }

      // Export messages (only if sessions exported)
      if (options.includeMessages && data.sessions) {
        const sessionIds = (data.sessions as { id: string }[]).map(s => s.id);
        const allMessages = [];

        for (const sessionId of sessionIds) {
          const messages = await this.messageRepo.findBySessionId(sessionId);
          allMessages.push(...messages);
        }

        data.messages = allMessages;
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }
}
