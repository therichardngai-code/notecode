/**
 * Task Controller
 * HTTP endpoints for task management
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { IMessageRepository } from '../../domain/ports/repositories/message.repository.port.js';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';
import { Task } from '../../domain/entities/task.entity.js';
import {
  TaskStatus,
  TaskPriority,
  AgentRole,
  ProviderType,
} from '../../domain/value-objects/task-status.vo.js';
import { IGitApprovalRepository } from '../repositories/sqlite-git-approval.repository.js';
import { GitService } from '../../domain/services/git.service.js';
import { IEventBus } from '../../domain/events/event-bus.js';
import { ISettingsRepository } from '../repositories/sqlite-settings.repository.js';
import {
  createTaskBranch,
  createGitCommitApproval,
  deleteTaskBranch,
} from './git.controller.js';

const createTaskSchema = z.object({
  projectId: z.string().uuid().optional(),  // Optional - uses active project if not provided
  parentId: z.string().uuid().optional(), // For subtasks
  dependencies: z.array(z.string().uuid()).optional().default([]), // Task IDs that must complete first
  title: z.string().min(1),
  description: z.string().optional().default(''),
  priority: z.enum(['high', 'medium', 'low']).nullable().default(null),
  agentId: z.string().uuid().optional(),
  agentRole: z.string().optional(),
  provider: z.enum(['anthropic', 'google', 'openai']).optional(),
  model: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
  tools: z.object({
    mode: z.enum(['allowlist', 'blocklist']),
    tools: z.array(z.string()),
  }).optional(),
  contextFiles: z.array(z.string()).optional().default([]),
  // Uploaded file paths (images + files) — merged into contextFiles on save
  attachments: z.array(z.string()).optional().default([]),
  subagentDelegates: z.boolean().optional().default(false),
  // Git config
  autoBranch: z.boolean().optional().default(false),
  autoCommit: z.boolean().optional().default(false),
  // Permission mode
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions']).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['not-started', 'in-progress', 'review', 'done', 'cancelled', 'archived']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  agentId: z.string().uuid().nullable().optional(),
  agentRole: z.string().nullable().optional(),
  provider: z.enum(['anthropic', 'google', 'openai']).nullable().optional(),
  model: z.string().nullable().optional(),
  // Skills, tools, context
  skills: z.array(z.string()).optional(),
  tools: z.object({
    mode: z.enum(['allowlist', 'blocklist']),
    tools: z.array(z.string()),
  }).nullable().optional(),
  contextFiles: z.array(z.string()).optional(),
  // Uploaded file paths (images + files) — merged into contextFiles on save
  attachments: z.array(z.string()).optional(),
  subagentDelegates: z.boolean().optional(),
  // Git config
  autoBranch: z.boolean().optional(),
  autoCommit: z.boolean().optional(),
  // Permission mode
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions']).nullable().optional(),
});

const moveTaskSchema = z.object({
  status: z.enum(['not-started', 'in-progress', 'review', 'done', 'cancelled', 'archived']),
  position: z.number().int().min(0).optional(),
});

/** Dependencies for task controller */
export interface TaskControllerDeps {
  taskRepo: ITaskRepository;
  projectRepo: IProjectRepository;
  gitApprovalRepo: IGitApprovalRepository;
  diffRepo: IDiffRepository;
  gitService: GitService;
  eventBus: IEventBus;
  settingsRepo: ISettingsRepository;
  messageRepo: IMessageRepository;
}

export function registerTaskController(
  app: FastifyInstance,
  taskRepo: ITaskRepository,
  deps?: Partial<TaskControllerDeps>
): void {
  // Dependencies (optional - if not provided, some features are skipped)
  const { projectRepo, gitApprovalRepo, diffRepo, gitService, eventBus, settingsRepo, messageRepo } = deps ?? {};
  // GET /api/tasks - List tasks (optionally by project)
  app.get('/api/tasks', async (request, reply) => {
    const { projectId, status, priority, search, agentId } = request.query as Record<string, string>;

    const filters = {
      status: status?.split(',') as TaskStatus[],
      priority: priority?.split(',') as TaskPriority[],
      search,
      agentId,
    };

    const tasks = projectId
      ? await taskRepo.findByProjectId(projectId, filters)
      : await taskRepo.findAll(filters);

    return reply.send({ tasks });
  });

  // GET /api/tasks/:id - Get single task
  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await taskRepo.findById(id);

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ task });
  });

  // GET /api/tasks/:id/messages - Get all messages for a task (across all sessions)
  app.get('/api/tasks/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit, sessionIds: sessionIdsParam } = request.query as {
      limit?: string;
      sessionIds?: string;  // Comma-separated session IDs
    };

    if (!messageRepo) {
      return reply.status(501).send({ error: 'Message repository not available' });
    }

    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Parse sessionIds from CSV string
    const sessionIds = sessionIdsParam
      ? sessionIdsParam.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const messages = await messageRepo.findByTaskId(id, {
      limit: limit ? parseInt(limit, 10) : 200,
      sessionIds
    });

    // Format messages for frontend
    const formattedMessages = messages.map(m => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.blocks.map(b => ('content' in b ? b.content : '')).join(''),
      blocks: m.blocks,
      timestamp: m.timestamp.toISOString(),
      toolName: m.toolName,
      status: m.status,
    }));

    return reply.send({
      messages: formattedMessages,
      total: formattedMessages.length,
    });
  });

  // GET /api/tasks/stats - Get task counts by status
  app.get('/api/tasks/stats', async (request, reply) => {
    const { projectId } = request.query as { projectId?: string };

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' });
    }

    const counts = await taskRepo.countByStatus(projectId);
    return reply.send({ counts });
  });

  // POST /api/tasks - Create task
  app.post('/api/tasks', async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    const now = new Date();

    // Resolve projectId: use provided or fall back to active project
    let projectId = body.projectId;
    if (!projectId && settingsRepo) {
      const settings = await settingsRepo.getGlobal();
      projectId = settings.currentActiveProjectId ?? undefined;
    }
    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required (no active project set)' });
    }

    // Merge attachments (uploaded files) into contextFiles (deduplicated)
    const mergedContextFiles = [...new Set([...(body.contextFiles ?? []), ...(body.attachments ?? [])])];

    const task = new Task(
      randomUUID(),
      projectId,
      body.agentId ?? null,
      body.parentId ?? null,
      body.dependencies ?? [],
      body.title,
      body.description,
      TaskStatus.NOT_STARTED,
      body.priority as TaskPriority,
      null,
      null,
      body.agentRole as AgentRole | null ?? null,
      body.provider as ProviderType | null ?? null,
      body.model ?? null,
      body.skills,
      body.tools ?? null,
      mergedContextFiles,
      null,
      body.subagentDelegates ?? false,
      // Git config
      body.autoBranch ?? false,
      body.autoCommit ?? false,
      null, // branchName
      null, // baseBranch
      null, // branchCreatedAt
      body.permissionMode ?? null,
      // Attempt tracking (init to 0)
      0, 0, 0, 0, null,
      null, // lastProviderSessionId
      now,
      now,
      null,
      null
    );

    await taskRepo.save(task);
    return reply.status(201).send({ task });
  });

  // PATCH /api/tasks/:id - Update task
  app.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);

    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Apply updates
    if (body.title) {
      task.updateTitle(body.title);
    }
    if (body.description !== undefined) {
      task.updateDescription(body.description);
    }
    if (body.priority) {
      task.updatePriority(body.priority as TaskPriority);
    }
    // Parent and dependencies
    if (body.parentId !== undefined) {
      task.parentId = body.parentId;
      task.updatedAt = new Date();
    }
    if (body.dependencies !== undefined) {
      task.dependencies = body.dependencies;
      task.updatedAt = new Date();
    }
    if (body.agentId !== undefined) {
      task.assignAgent(body.agentId);
    }
    if (body.agentRole !== undefined || body.provider !== undefined || body.model !== undefined) {
      task.setAgentConfiguration(
        body.agentRole !== undefined ? body.agentRole as AgentRole | null : task.agentRole,
        body.provider !== undefined ? body.provider as ProviderType | null : task.provider,
        body.model !== undefined ? body.model : task.model
      );
    }
    // Skills, tools, context files
    if (body.skills !== undefined) {
      task.setSkills(body.skills);
    }
    if (body.tools !== undefined) {
      task.setTools(body.tools);
    }
    if (body.contextFiles !== undefined || body.attachments !== undefined) {
      // Merge contextFiles + attachments (deduplicated)
      const base = body.contextFiles ?? task.contextFiles;
      const uploads = body.attachments ?? [];
      task.setContextFiles([...new Set([...base, ...uploads])]);
    }
    if (body.subagentDelegates !== undefined) {
      task.subagentDelegates = body.subagentDelegates;
      task.updatedAt = new Date();
    }
    // Git config (only if not already has branch)
    if ((body.autoBranch !== undefined || body.autoCommit !== undefined) && !task.hasBranch()) {
      task.setGitConfig(
        body.autoBranch ?? task.autoBranch,
        body.autoCommit ?? task.autoCommit
      );
    }
    // Permission mode
    if (body.permissionMode !== undefined) {
      task.permissionMode = body.permissionMode;
      task.updatedAt = new Date();
    }

    // Track status change for git hooks
    const oldStatus = task.status;
    const newStatus = body.status as TaskStatus | undefined;

    if (newStatus) {
      task.updateStatus(newStatus);
    }

    await taskRepo.save(task);

    // Track warnings for response
    const warnings: Array<{ code: string; message: string; action?: string; projectId?: string }> = [];

    // Git hooks on status change (async, non-blocking)
    if (newStatus && oldStatus !== newStatus && projectRepo && gitApprovalRepo && gitService && eventBus) {
      const project = await projectRepo.findById(task.projectId);
      if (project?.path) {
        try {
          const isRepo = await gitService.isGitRepo(project.path);

          // Check for git init required warning
          if (newStatus === TaskStatus.IN_PROGRESS && task.autoBranch && !isRepo) {
            warnings.push({
              code: 'GIT_INIT_REQUIRED',
              message: 'Project is not a git repository. Auto-branch requires git to be initialized.',
              action: 'git_init',
              projectId: task.projectId,
            });
          }

          if (isRepo) {
            // Task started → create branch
            if (newStatus === TaskStatus.IN_PROGRESS && task.autoBranch) {
              await createTaskBranch(
                { id: task.id, projectId: task.projectId, autoBranch: task.autoBranch, branchName: task.branchName },
                taskRepo,
                gitService,
                project.path,
                eventBus
              );
            }

            // Task done → create commit approval (manual override, no session context)
            if (newStatus === TaskStatus.DONE && diffRepo) {
              await createGitCommitApproval(
                { id: task.id, projectId: task.projectId, title: task.title, autoCommit: task.autoCommit },
                null, // No session context for manual status change
                gitApprovalRepo,
                diffRepo,
                gitService,
                project.path,
                eventBus
              );
            }

            // Task archived → delete branch
            if (newStatus === TaskStatus.ARCHIVED && task.branchName) {
              await deleteTaskBranch(
                { id: task.id, projectId: task.projectId, branchName: task.branchName, baseBranch: task.baseBranch },
                taskRepo,
                gitService,
                project.path,
                eventBus
              );
            }
          }
        } catch (error) {
          // Log but don't fail the status update
          app.log.error({ error, taskId: task.id, newStatus }, 'Git hook failed');
        }
      }
    }

    return reply.send({ task, warnings: warnings.length > 0 ? warnings : undefined });
  });

  // POST /api/tasks/:id/move - Move task (drag & drop)
  app.post('/api/tasks/:id/move', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = moveTaskSchema.parse(request.body);

    const task = await taskRepo.findById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    try {
      const oldStatus = task.status;
      const newStatus = body.status as TaskStatus;

      task.updateStatus(newStatus);
      await taskRepo.save(task);

      // Track warnings for response
      const warnings: Array<{ code: string; message: string; action?: string; projectId?: string }> = [];

      // Git hooks on status change (async, non-blocking)
      if (oldStatus !== newStatus && projectRepo && gitApprovalRepo && gitService && eventBus) {
        const project = await projectRepo.findById(task.projectId);
        if (project?.path) {
          try {
            const isRepo = await gitService.isGitRepo(project.path);

            // Check for git init required warning
            if (newStatus === TaskStatus.IN_PROGRESS && task.autoBranch && !isRepo) {
              warnings.push({
                code: 'GIT_INIT_REQUIRED',
                message: 'Project is not a git repository. Auto-branch requires git to be initialized.',
                action: 'git_init',
                projectId: task.projectId,
              });
            }

            if (isRepo) {
              // Task started → create branch
              if (newStatus === TaskStatus.IN_PROGRESS && task.autoBranch) {
                await createTaskBranch(
                  { id: task.id, projectId: task.projectId, autoBranch: task.autoBranch, branchName: task.branchName },
                  taskRepo,
                  gitService,
                  project.path,
                  eventBus
                );
              }

              // Task done → create commit approval (manual override, no session context)
              if (newStatus === TaskStatus.DONE && diffRepo) {
                await createGitCommitApproval(
                  { id: task.id, projectId: task.projectId, title: task.title, autoCommit: task.autoCommit },
                  null, // No session context for manual status change
                  gitApprovalRepo,
                  diffRepo,
                  gitService,
                  project.path,
                  eventBus
                );
              }

              // Task archived → delete branch
              if (newStatus === TaskStatus.ARCHIVED && task.branchName) {
                await deleteTaskBranch(
                  { id: task.id, projectId: task.projectId, branchName: task.branchName, baseBranch: task.baseBranch },
                  taskRepo,
                  gitService,
                  project.path,
                  eventBus
                );
              }
            }
          } catch (gitError) {
            app.log.error({ error: gitError, taskId: task.id, newStatus }, 'Git hook failed');
          }
        }
      }

      return reply.send({ task, warnings: warnings.length > 0 ? warnings : undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid status transition';
      return reply.status(400).send({ error: message });
    }
  });

  // DELETE /api/tasks/:id - Delete task
  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await taskRepo.delete(id);

    if (!deleted) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.send({ success: true });
  });
}
