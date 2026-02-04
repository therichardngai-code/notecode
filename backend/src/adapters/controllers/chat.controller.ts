/**
 * Chat Controller
 * HTTP endpoints for Chat Mode - direct conversations on projects without formal tasks
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { Task } from '../../domain/entities/task.entity.js';
import {
  TaskStatus,
  TaskPriority,
  ProviderType,
} from '../../domain/value-objects/task-status.vo.js';
import { StartSessionUseCase } from '../../use-cases/sessions/start-session.use-case.js';

// Schema for starting a chat
const startChatSchema = z.object({
  message: z.string().min(1),
  attachments: z.array(z.string()).optional().default([]),
  provider: z.enum(['anthropic', 'google', 'openai']).optional(),
  model: z.string().optional(),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions']).optional(),
  disableWebTools: z.boolean().optional().default(false),
});

// Schema for continuing a chat (resume/fork)
const continueChatSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(['retry', 'fork']).optional().default('retry'), // retry=resume, fork=new+context
  attachments: z.array(z.string()).optional().default([]),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions']).optional(),
});

// Dependencies container
export interface ChatControllerDeps {
  projectRepo: IProjectRepository;
  taskRepo: ITaskRepository;
  sessionRepo: ISessionRepository;
  startSessionUseCase: StartSessionUseCase;
}

/**
 * Generate chat title from first message
 * Extracts first 6 words, max 50 chars
 */
function generateChatTitle(message: string): string {
  // Clean up: remove newlines, trim whitespace
  const cleaned = message.trim().replace(/\n+/g, ' ');

  // Extract first 6 words
  const words = cleaned.split(/\s+/).slice(0, 6).join(' ');

  // Truncate if over 50 chars
  if (words.length > 50) {
    return words.slice(0, 47) + '...';
  }

  // Add ellipsis if message was truncated
  if (cleaned.split(/\s+/).length > 6) {
    return words + '...';
  }

  return words;
}

/**
 * Determine if an attachment is an image based on path/extension
 */
function isImagePath(path: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const lowerPath = path.toLowerCase();
  return imageExtensions.some(ext => lowerPath.endsWith(ext));
}

export function registerChatController(
  app: FastifyInstance,
  deps: ChatControllerDeps
): void {
  const { projectRepo, taskRepo, sessionRepo, startSessionUseCase } = deps;

  // POST /api/projects/:projectId/chat - Start a new chat session
  app.post('/api/projects/:projectId/chat', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = startChatSchema.parse(request.body);

    // 1. Validate project exists
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // 2. Separate attachments into files and images
    const fileAttachments: string[] = [];
    const imageAttachments: string[] = [];

    for (const attachment of body.attachments) {
      if (isImagePath(attachment)) {
        imageAttachments.push(attachment);
      } else {
        fileAttachments.push(attachment);
      }
    }

    // 3. Create ephemeral chat task (IN_PROGRESS to allow immediate session start)
    const now = new Date();
    const task = new Task(
      randomUUID(),
      projectId,
      null, // agentId
      null, // parentId
      [], // dependencies
      generateChatTitle(body.message),
      body.message, // Store original message in description
      TaskStatus.IN_PROGRESS,
      TaskPriority.MEDIUM,
      null, // assignee
      null, // dueDate
      null, // agentRole
      body.provider as ProviderType | null ?? null,
      body.model ?? null,
      [], // skills
      body.disableWebTools
        ? { mode: 'blocklist', tools: ['WebSearch', 'WebFetch'] }
        : null,
      fileAttachments, // contextFiles (non-image attachments)
      'chat', // workflowStage - marks this as a chat task
      false, // subagentDelegates
      // Git config (disabled for chat)
      false, // autoBranch
      false, // autoCommit
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

    // 4. Build initial prompt with image attachments if any
    // Note: Images need special handling - for now, we'll include them as @ references
    // Full image content block support requires Claude CLI changes
    let initialPrompt = body.message;
    if (imageAttachments.length > 0) {
      // TODO: When Claude CLI supports image content blocks, handle images separately
      // For now, add as @ references (Claude will read them as files)
      initialPrompt += `\n\n<attached-images>\n${imageAttachments.map(img => `@${img}`).join('\n')}\n</attached-images>`;
    }

    // 5. Start session with the task
    const result = await startSessionUseCase.execute({
      taskId: task.id,
      initialPrompt,
      permissionMode: body.permissionMode,
    });

    if (!result.success) {
      // Clean up task if session failed
      await taskRepo.delete(task.id);
      return reply.status(400).send({ error: result.error });
    }

    // 6. Return response
    return reply.status(201).send({
      task: {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        workflowStage: task.workflowStage,
        createdAt: task.createdAt,
      },
      session: {
        id: result.session!.id,
        taskId: result.session!.taskId,
        status: result.session!.status,
        providerSessionId: result.session!.providerSessionId,
        provider: result.session!.provider,
        createdAt: result.session!.createdAt,
      },
      wsUrl: `/ws/session/${result.session!.id}`,
    });
  });

  // GET /api/projects/:projectId/chats - List chat sessions for a project
  app.get('/api/projects/:projectId/chats', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    // 1. Validate project exists
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // 2. Find all tasks with workflowStage = 'chat' for this project
    const allTasks = await taskRepo.findByProjectId(projectId);
    const chatTasks = allTasks.filter(t => t.workflowStage === 'chat');

    // 3. Get latest session for each chat task
    const chats = await Promise.all(
      chatTasks.map(async (task) => {
        const sessions = await sessionRepo.findByTaskId(task.id);
        const latestSession = sessions.length > 0
          ? sessions.reduce((latest, s) =>
              s.createdAt > latest.createdAt ? s : latest
            )
          : null;

        return {
          id: task.id,
          title: task.title,
          createdAt: task.createdAt,
          lastSession: latestSession
            ? {
                id: latestSession.id,
                status: latestSession.status,
                updatedAt: latestSession.updatedAt,
              }
            : null,
        };
      })
    );

    // 4. Sort by createdAt descending (newest first)
    chats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return reply.send({ chats });
  });

  // POST /api/projects/:projectId/chats/:chatId/continue - Continue existing chat
  app.post('/api/projects/:projectId/chats/:chatId/continue', async (request, reply) => {
    const { projectId, chatId } = request.params as { projectId: string; chatId: string };
    const body = continueChatSchema.parse(request.body);

    // 1. Validate chat task exists and belongs to project
    const task = await taskRepo.findById(chatId);
    if (!task) {
      return reply.status(404).send({ error: 'Chat not found' });
    }

    if (task.projectId !== projectId) {
      return reply.status(403).send({ error: 'Chat does not belong to this project' });
    }

    if (task.workflowStage !== 'chat') {
      return reply.status(400).send({ error: 'Task is not a chat' });
    }

    // 2. Check for running session - block if active
    const existingSessions = await sessionRepo.findByTaskId(chatId);
    const runningSession = existingSessions.find(s => s.status === 'running');
    if (runningSession) {
      return reply.status(409).send({
        error: 'Chat already has a running session',
        sessionId: runningSession.id,
      });
    }

    // 3. Separate attachments into files and images
    const fileAttachments: string[] = [];
    const imageAttachments: string[] = [];

    for (const attachment of body.attachments) {
      if (isImagePath(attachment)) {
        imageAttachments.push(attachment);
      } else {
        fileAttachments.push(attachment);
      }
    }

    // 4. Update task context files if new attachments provided
    if (fileAttachments.length > 0) {
      const existingFiles = new Set(task.contextFiles);
      for (const file of fileAttachments) {
        existingFiles.add(file);
      }
      task.contextFiles = Array.from(existingFiles);
      await taskRepo.save(task);
    }

    // 5. Build prompt with image attachments if any
    let prompt = body.message;
    if (imageAttachments.length > 0) {
      prompt += `\n\n<attached-images>\n${imageAttachments.map(img => `@${img}`).join('\n')}\n</attached-images>`;
    }

    // 6. Start session with resume mode
    const result = await startSessionUseCase.execute({
      taskId: chatId,
      initialPrompt: prompt,
      permissionMode: body.permissionMode,
      mode: body.mode, // 'retry' or 'fork'
    });

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    // 7. Return response (same format as start chat)
    return reply.status(200).send({
      task: {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        workflowStage: task.workflowStage,
        createdAt: task.createdAt,
      },
      session: {
        id: result.session!.id,
        taskId: result.session!.taskId,
        status: result.session!.status,
        providerSessionId: result.session!.providerSessionId,
        provider: result.session!.provider,
        createdAt: result.session!.createdAt,
      },
      wsUrl: `/ws/session/${result.session!.id}`,
    });
  });

  // DELETE /api/projects/:projectId/chats/:chatId - Delete a chat
  app.delete('/api/projects/:projectId/chats/:chatId', async (request, reply) => {
    const { projectId, chatId } = request.params as { projectId: string; chatId: string };

    // 1. Validate task exists and belongs to project
    const task = await taskRepo.findById(chatId);
    if (!task) {
      return reply.status(404).send({ error: 'Chat not found' });
    }

    if (task.projectId !== projectId) {
      return reply.status(403).send({ error: 'Chat does not belong to this project' });
    }

    if (task.workflowStage !== 'chat') {
      return reply.status(400).send({ error: 'Task is not a chat' });
    }

    // 2. Delete the chat task (sessions cascade delete via FK or manual)
    const deleted = await taskRepo.delete(chatId);
    if (!deleted) {
      return reply.status(500).send({ error: 'Failed to delete chat' });
    }

    return reply.send({ success: true });
  });
}
