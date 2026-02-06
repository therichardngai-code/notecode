/**
 * Git Controller
 * HTTP endpoints for git operations and commit approvals
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ITaskRepository } from '../../domain/ports/repositories/task.repository.port.js';
import { IProjectRepository } from '../../domain/ports/repositories/project.repository.port.js';
import { ISessionRepository } from '../../domain/ports/repositories/session.repository.port.js';
import { IGitApprovalRepository } from '../repositories/sqlite-git-approval.repository.js';
import { IDiffRepository } from '../../domain/ports/repositories/diff.repository.port.js';
import { GitService } from '../../domain/services/git.service.js';
import { DiffRevertService } from '../../domain/services/diff-revert.service.js';
import { GitCommitApproval, GitApprovalStatus } from '../../domain/entities/git-commit-approval.entity.js';
import {
  IEventBus,
  GitApprovalCreatedEvent,
  GitApprovalResolvedEvent,
  GitBranchCreatedEvent,
  GitBranchDeletedEvent,
} from '../../domain/events/event-bus.js';
import { SqliteSettingsRepository } from '../repositories/sqlite-settings.repository.js';

const approveCommitSchema = z.object({
  commitMessage: z.string().optional(),
});

const rejectCommitSchema = z.object({
  discardChanges: z.boolean().optional().default(false),
});

export function registerGitController(
  app: FastifyInstance,
  taskRepo: ITaskRepository,
  projectRepo: IProjectRepository,
  gitApprovalRepo: IGitApprovalRepository,
  gitService: GitService,
  eventBus: IEventBus,
  diffRevertService?: DiffRevertService, // For combined approval (batch diff operations)
  sessionRepo?: ISessionRepository // For getting session working dir
): void {
  // GET /api/tasks/:taskId/git/status - Get task git status
  app.get('/api/tasks/:taskId/git/status', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };

    const task = await taskRepo.findById(taskId);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const project = await projectRepo.findById(task.projectId);
    if (!project || !project.path) {
      return reply.status(400).send({ error: 'Project path not configured' });
    }

    try {
      const isRepo = await gitService.isGitRepo(project.path);
      if (!isRepo) {
        return reply.send({
          branchName: null,
          baseBranch: null,
          currentBranch: null,
          isOnTaskBranch: false,
          hasChanges: false,
          staged: [],
          unstaged: [],
          untracked: [],
          summary: null,
          pendingApproval: null,
          error: 'Not a git repository',
        });
      }

      const status = await gitService.getStatus(project.path);
      const isOnTaskBranch = task.branchName ? status.currentBranch === task.branchName : false;

      let summary = null;
      if (!status.isClean) {
        summary = await gitService.getDiffSummary(project.path);
      }

      const pendingApproval = await gitApprovalRepo.findPendingByTaskId(taskId);

      return reply.send({
        branchName: task.branchName,
        baseBranch: task.baseBranch,
        currentBranch: status.currentBranch,
        isOnTaskBranch,
        hasChanges: !status.isClean,
        staged: status.staged,
        unstaged: status.unstaged,
        untracked: status.untracked,
        summary,
        pendingApproval: pendingApproval ? {
          id: pendingApproval.id,
          status: pendingApproval.status,
          createdAt: pendingApproval.createdAt.toISOString(),
        } : null,
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get git status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/projects/:projectId/git/branch - Get git branch info for status bar
  // Returns: isGitRepo, branch name, clean/dirty status (like VS Code footer)
  app.get('/api/projects/:projectId/git/branch', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const project = await projectRepo.findById(projectId);
    if (!project?.path) {
      return reply.send({ isGitRepo: false, branch: null, isDirty: false });
    }

    try {
      const isRepo = await gitService.isGitRepo(project.path);
      if (!isRepo) {
        return reply.send({ isGitRepo: false, branch: null, isDirty: false });
      }

      const status = await gitService.getStatus(project.path);
      return reply.send({
        isGitRepo: true,
        branch: status.currentBranch,
        isDirty: !status.isClean,
      });
    } catch (error) {
      // Graceful fallback — don't break the footer for git errors
      return reply.send({ isGitRepo: false, branch: null, isDirty: false });
    }
  });

  // GET /api/tasks/:taskId/git/approvals - Get task git commit approvals
  app.get('/api/tasks/:taskId/git/approvals', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };

    const task = await taskRepo.findById(taskId);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const approvals = await gitApprovalRepo.findByTaskId(taskId);

    // Return all approvals for this task (including resolved ones for activity timeline)
    const enrichedApprovals = approvals.map((approval) => ({
      id: approval.id,
      taskId: approval.taskId,
      projectId: approval.projectId,
      attemptNumber: approval.attemptNumber,
      status: approval.status,
      commitMessage: approval.commitMessage,
      filesChanged: approval.filesChanged,
      diffSummary: approval.diffSummary,
      commitSha: approval.commitSha,
      createdAt: approval.createdAt.toISOString(),
      resolvedAt: approval.resolvedAt?.toISOString() ?? null,
    }));

    return reply.send({
      approvals: enrichedApprovals,
    });
  });

  // GET /api/projects/:projectId/git/status - Get project git status
  app.get('/api/projects/:projectId/git/status', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const project = await projectRepo.findById(projectId);
    if (!project || !project.path) {
      return reply.status(404).send({ error: 'Project not found or path not configured' });
    }

    try {
      const isRepo = await gitService.isGitRepo(project.path);
      if (!isRepo) {
        return reply.send({ error: 'Not a git repository' });
      }

      const status = await gitService.getStatus(project.path);
      const lastCommit = await gitService.getLastCommit(project.path);

      // Find task branches
      const tasks = await taskRepo.findByProjectId(projectId);
      const taskBranches = tasks
        .filter(t => t.branchName)
        .map(t => ({
          branchName: t.branchName,
          taskId: t.id,
          taskTitle: t.title,
        }));

      return reply.send({
        currentBranch: status.currentBranch,
        isClean: status.isClean,
        staged: status.staged,
        unstaged: status.unstaged,
        untracked: status.untracked,
        lastCommit: {
          sha: lastCommit.sha,
          message: lastCommit.message,
          author: lastCommit.author,
          date: lastCommit.date.toISOString(),
        },
        taskBranches,
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get git status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/git/approvals - List git commit approvals
  app.get('/api/git/approvals', async (request, reply) => {
    const { projectId, status } = request.query as { projectId?: string; status?: string };

    if (!projectId) {
      return reply.status(400).send({ error: 'projectId required' });
    }

    const approvalStatus = status === 'all' ? undefined : (status as GitApprovalStatus | undefined) ?? 'pending';
    const approvals = await gitApprovalRepo.findByProjectId(projectId, approvalStatus);

    // Enrich with task info
    const enrichedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const task = await taskRepo.findById(approval.taskId);
        return {
          id: approval.id,
          taskId: approval.taskId,
          projectId: approval.projectId,
          attemptNumber: approval.attemptNumber,
          status: approval.status,
          commitMessage: approval.commitMessage,
          filesChanged: approval.filesChanged,
          diffSummary: approval.diffSummary,
          commitSha: approval.commitSha,
          createdAt: approval.createdAt.toISOString(),
          resolvedAt: approval.resolvedAt?.toISOString() ?? null,
          task: task ? {
            id: task.id,
            title: task.title,
            branchName: task.branchName,
          } : null,
        };
      })
    );

    return reply.send({
      approvals: enrichedApprovals,
      total: enrichedApprovals.length,
    });
  });

  // GET /api/git/approvals/:id - Get single approval with diff
  app.get('/api/git/approvals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const approval = await gitApprovalRepo.findById(id);
    if (!approval) {
      return reply.status(404).send({ error: 'Approval not found' });
    }

    const task = await taskRepo.findById(approval.taskId);
    const project = task ? await projectRepo.findById(task.projectId) : null;

    let diff = null;
    if (project?.path && approval.status === 'pending') {
      try {
        const fileDiffs = await gitService.getFileDiffs(project.path);
        diff = { files: fileDiffs };
      } catch {
        // Ignore diff errors
      }
    }

    return reply.send({
      approval: {
        id: approval.id,
        taskId: approval.taskId,
        projectId: approval.projectId,
        attemptNumber: approval.attemptNumber,
        status: approval.status,
        commitMessage: approval.commitMessage,
        filesChanged: approval.filesChanged,
        diffSummary: approval.diffSummary,
        commitSha: approval.commitSha,
        createdAt: approval.createdAt.toISOString(),
        resolvedAt: approval.resolvedAt?.toISOString() ?? null,
      },
      diff,
    });
  });

  // POST /api/git/approvals/:id/approve - Approve and commit
  app.post('/api/git/approvals/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = approveCommitSchema.parse(request.body ?? {});

    const approval = await gitApprovalRepo.findById(id);
    if (!approval) {
      return reply.status(404).send({ error: 'Approval not found' });
    }

    if (approval.status !== 'pending') {
      return reply.status(409).send({ error: 'Approval already resolved' });
    }

    const task = await taskRepo.findById(approval.taskId);
    const project = task ? await projectRepo.findById(task.projectId) : null;

    if (!project?.path) {
      return reply.status(400).send({ error: 'Project path not configured' });
    }

    try {
      // Guard: check if git is initialized
      const isRepo = await gitService.isGitRepo(project.path);
      if (!isRepo) {
        return reply.status(400).send({
          error: 'Git not initialized',
          code: 'GIT_NOT_INITIALIZED',
        });
      }

      // Check if there are changes to commit
      const hasChanges = await gitService.hasChanges(project.path);
      if (!hasChanges) {
        return reply.status(400).send({
          error: 'No changes to commit',
          code: 'NO_CHANGES',
        });
      }

      // 1. Approve all diffs for session (Combined Approval: commit approval = batch approve all diffs)
      if (diffRevertService && approval.sessionId) {
        await diffRevertService.approveAllSessionDiffs(approval.sessionId);
      }

      // Use custom message or default
      const commitMessage = body.commitMessage ?? approval.commitMessage;

      // 2. Perform commit
      const commitSha = await gitService.commit(project.path, commitMessage);

      // Update approval
      approval.approve(commitSha);
      if (body.commitMessage) {
        approval.commitMessage = body.commitMessage;
      }
      await gitApprovalRepo.save(approval);

      // 3. Mark all diffs as applied (clears content to save storage)
      if (diffRevertService && approval.sessionId) {
        await diffRevertService.markAllApplied(approval.sessionId);
      }

      // 4. Emit WebSocket event (triggers task transition REVIEW → DONE)
      eventBus.publish([
        new GitApprovalResolvedEvent(
          approval.id,
          approval.projectId,
          'approved',
          { sha: commitSha, message: commitMessage }
        )
      ]);

      return reply.send({
        success: true,
        approval: {
          id: approval.id,
          status: approval.status,
          resolvedAt: approval.resolvedAt?.toISOString(),
        },
        commit: {
          sha: commitSha,
          message: commitMessage,
        },
        message: 'Commit created and all diffs approved',
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to commit',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/git/approvals/:id/reject - Reject and optionally discard changes
  app.post('/api/git/approvals/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = rejectCommitSchema.parse(request.body ?? {});

    const approval = await gitApprovalRepo.findById(id);
    if (!approval) {
      return reply.status(404).send({ error: 'Approval not found' });
    }

    if (approval.status !== 'pending') {
      return reply.status(409).send({ error: 'Approval already resolved' });
    }

    const task = await taskRepo.findById(approval.taskId);
    const project = task ? await projectRepo.findById(task.projectId) : null;

    try {
      // 1. Batch revert all diffs (Combined Approval: reject = revert all changes)
      let revertResult = null;
      if (diffRevertService && sessionRepo && approval.sessionId) {
        const session = await sessionRepo.findById(approval.sessionId);
        if (session?.workingDir) {
          revertResult = await diffRevertService.revertAllSessionDiffs(
            approval.sessionId,
            session.workingDir
          );
        }
      }

      // 2. Discard git changes if requested (fallback for non-diff tracked changes)
      let changesDiscarded = false;
      if (body.discardChanges && project?.path) {
        // Guard: only discard if git is initialized
        const isRepo = await gitService.isGitRepo(project.path);
        if (isRepo) {
          await gitService.discardChanges(project.path);
          changesDiscarded = true;
        }
      }

      // 3. Update approval
      approval.reject();
      await gitApprovalRepo.save(approval);

      // 4. Emit WebSocket event (triggers task transition REVIEW → IN_PROGRESS)
      eventBus.publish([
        new GitApprovalResolvedEvent(
          approval.id,
          approval.projectId,
          'rejected'
        )
      ]);

      return reply.send({
        success: true,
        approval: {
          id: approval.id,
          status: approval.status,
          resolvedAt: approval.resolvedAt?.toISOString(),
        },
        changesDiscarded,
        revertResult,
        message: 'Commit rejected and all diffs reverted',
      });
    } catch (error) {
      console.error('[Git] Reject approval failed:', error instanceof Error ? error.message : error);
      return reply.status(500).send({
        error: 'Failed to reject',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/projects/:id/git/init - Initialize git repository in project
  app.post('/api/projects/:id/git/init', async (request, reply) => {
    const { id } = request.params as { id: string };

    const project = await projectRepo.findById(id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    if (!project.path) {
      return reply.status(400).send({ error: 'Project path not configured' });
    }

    try {
      // Check if already a git repo
      const isRepo = await gitService.isGitRepo(project.path);
      let wasInitialized = false;

      if (!isRepo) {
        // Initialize git
        await gitService.initRepo(project.path);
        wasInitialized = true;
      }

      // Check if repo has commits (empty repos cause branch issues)
      const hasCommits = await gitService.hasCommits(project.path);
      let initialCommitCreated = false;

      if (!hasCommits) {
        // Fetch settings for user config fallback
        const settingsRepo = new SqliteSettingsRepository();
        const globalSettings = await settingsRepo.getGlobal();

        // Create initial commit with settings fallback
        await gitService.createInitialCommit(project.path, {
          name: globalSettings.userName,
          email: globalSettings.userEmail,
        });
        initialCommitCreated = true;
      }

      return reply.status(200).send({
        success: true,
        message: wasInitialized
          ? 'Git repository initialized with initial commit'
          : initialCommitCreated
            ? 'Initial commit created'
            : 'Already a git repository with commits',
        initialized: wasInitialized,
        initialCommitCreated,
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to initialize git',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

/**
 * Helper: Create git commit approval when task completes
 * Called from task status update flow
 * Uses task-level diffs (not git status) to get accurate file list
 */
export async function createGitCommitApproval(
  task: { id: string; projectId: string; title: string; autoCommit: boolean },
  sessionId: string | null,
  gitApprovalRepo: IGitApprovalRepository,
  diffRepo: IDiffRepository,
  gitService: GitService,
  projectPath: string,
  eventBus: IEventBus
): Promise<GitCommitApproval | null> {
  // Guard: skip commit approval if project folder has no git initialized
  const isRepo = await gitService.isGitRepo(projectPath);
  if (!isRepo) {
    console.log(`[Git] Skipping commit approval — not a git repo: ${projectPath}`);
    return null;
  }

  // Get uncommitted diffs for this task (pending or approved, not applied/rejected)
  const allDiffs = await diffRepo.findByTaskId(task.id);
  const uncommittedDiffs = allDiffs.filter(d =>
    d.status === 'pending' || d.status === 'approved'
  );

  // No uncommitted diffs = no approval needed
  if (uncommittedDiffs.length === 0) {
    return null;
  }

  // If autoCommit, commit immediately (only diff files, not all changes)
  if (task.autoCommit) {
    const commitMessage = `task: ${task.title}`;
    const filePaths = [...new Set(uncommittedDiffs.map(d => d.filePath))];
    await gitService.commitFiles(projectPath, commitMessage, filePaths);
    return null;
  }

  // Extract unique file paths from diffs
  const filesChanged = [...new Set(uncommittedDiffs.map(d => d.filePath))];
  const diffSummary = await gitService.getDiffSummary(projectPath);

  // Check for existing pending approval - update instead of create
  const existingPending = await gitApprovalRepo.findPendingByTaskId(task.id);

  let approval: GitCommitApproval;
  if (existingPending) {
    // Update existing pending approval with new file list
    existingPending.updateForNewSession(
      sessionId,
      filesChanged,
      diffSummary,
      `task: ${task.title}`
    );
    await gitApprovalRepo.save(existingPending);
    approval = existingPending;
  } else {
    // Create new approval
    const attemptNumber = (await gitApprovalRepo.countByTaskId(task.id)) + 1;
    approval = new GitCommitApproval(
      randomUUID(),
      task.id,
      task.projectId,
      sessionId,
      attemptNumber,
      'pending',
      `task: ${task.title}`,
      filesChanged,
      diffSummary,
      null,
      new Date(),
      null,
      null // pushedAt
    );
    await gitApprovalRepo.save(approval);
  }

  // Emit WebSocket event (taskStatus = 'review' since approval triggers REVIEW)
  eventBus.publish([
    new GitApprovalCreatedEvent(
      approval.id,
      approval.projectId,
      approval.taskId,
      'review', // Task transitions to REVIEW when approval created
      approval.commitMessage,
      approval.filesChanged,
      approval.diffSummary
    )
  ]);

  return approval;
}

/**
 * Helper: Create task branch when task starts
 * Called from task status update flow
 */
export async function createTaskBranch(
  task: { id: string; projectId: string; autoBranch: boolean; branchName: string | null },
  taskRepo: ITaskRepository,
  gitService: GitService,
  projectPath: string,
  eventBus: IEventBus
): Promise<{ branchName: string; baseBranch: string } | null> {
  if (!task.autoBranch || task.branchName) {
    return null; // Not enabled or already has branch
  }

  const taskEntity = await taskRepo.findById(task.id);
  if (!taskEntity) {
    return null;
  }

  const baseBranch = await gitService.getCurrentBranch(projectPath);
  const branchName = taskEntity.generateBranchName();

  await gitService.createBranch(projectPath, branchName);

  // Update task with branch info
  taskEntity.setBranchInfo(branchName, baseBranch);
  await taskRepo.save(taskEntity);

  // Emit WebSocket event
  eventBus.publish([
    new GitBranchCreatedEvent(
      task.id,
      task.projectId,
      branchName,
      baseBranch
    )
  ]);

  return { branchName, baseBranch };
}

/**
 * Helper: Delete task branch when task is archived
 * Called from task status update flow
 */
export async function deleteTaskBranch(
  task: { id: string; projectId: string; branchName: string | null; baseBranch: string | null },
  taskRepo: ITaskRepository,
  gitService: GitService,
  projectPath: string,
  eventBus: IEventBus
): Promise<boolean> {
  if (!task.branchName || !task.baseBranch) {
    return false;
  }

  const taskEntity = await taskRepo.findById(task.id);
  if (!taskEntity) {
    return false;
  }

  // Switch to base branch first
  await gitService.checkoutBranch(projectPath, task.baseBranch);

  // Delete task branch
  await gitService.deleteBranch(projectPath, task.branchName);

  // Clear branch info
  taskEntity.clearBranchInfo();
  await taskRepo.save(taskEntity);

  // Emit WebSocket event
  eventBus.publish([
    new GitBranchDeletedEvent(
      task.id,
      task.projectId,
      task.branchName
    )
  ]);

  return true;
}
