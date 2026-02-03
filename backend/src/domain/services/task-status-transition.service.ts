/**
 * Task Status Transition Service
 * Auto-transitions task status based on session/approval events
 *
 * Transitions:
 * - Session completes + changes + !autoCommit → IN_PROGRESS → REVIEW
 * - Session completes + changes + autoCommit → IN_PROGRESS → DONE (auto-commit)
 * - Commit approved → REVIEW → DONE
 * - Commit rejected → REVIEW → IN_PROGRESS
 */

import { ITaskRepository } from '../ports/repositories/task.repository.port.js';
import { ISessionRepository } from '../ports/repositories/session.repository.port.js';
import { IEventBus, TaskStatusChangedEvent } from '../events/event-bus.js';
import { TaskStatus } from '../value-objects/task-status.vo.js';
import { GitService } from './git.service.js';
import { Task } from '../entities/task.entity.js';

export class TaskStatusTransitionService {
  constructor(
    private taskRepo: ITaskRepository,
    private sessionRepo: ISessionRepository,
    private gitService: GitService,
    private eventBus: IEventBus
  ) {}

  /**
   * Called when session completes - trigger REVIEW or DONE based on autoCommit
   */
  async onSessionCompleted(sessionId: string, projectPath: string): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session?.taskId) return;

    const task = await this.taskRepo.findById(session.taskId);
    if (!task || task.status !== TaskStatus.IN_PROGRESS) return;

    // Check if there are changes to commit
    const hasChanges = await this.gitService.hasChanges(projectPath);
    if (!hasChanges) {
      // No changes, stay IN_PROGRESS
      console.log('[TaskTransition] No changes detected, staying IN_PROGRESS');
      return;
    }

    if (task.autoCommit) {
      // Auto-commit flow: commit immediately → DONE
      await this.handleAutoCommit(task, projectPath);
    } else {
      // Manual approval flow: → REVIEW
      await this.transitionToReview(task);
    }
  }

  /**
   * Auto-commit: commit changes and transition to DONE
   */
  private async handleAutoCommit(task: Task, projectPath: string): Promise<void> {
    try {
      const commitMessage = `task: ${task.title}`;
      await this.gitService.commit(projectPath, commitMessage);
      console.log('[TaskTransition] Auto-commit successful');

      // Transition to DONE
      await this.transitionTask(task, TaskStatus.DONE);
    } catch (error) {
      console.error('[TaskTransition] Auto-commit failed:', error);
      // Stay IN_PROGRESS if commit fails
    }
  }

  /**
   * Manual approval: transition to REVIEW (GitCommitApproval created separately)
   */
  private async transitionToReview(task: Task): Promise<void> {
    await this.transitionTask(task, TaskStatus.REVIEW);
    console.log('[TaskTransition] Task transitioned to REVIEW');
  }

  /**
   * Called when GitCommitApproval is approved
   */
  async onCommitApproved(taskId: string): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task || task.status !== TaskStatus.REVIEW) return;

    await this.transitionTask(task, TaskStatus.DONE);
    console.log('[TaskTransition] Commit approved, task → DONE');
  }

  /**
   * Called when GitCommitApproval is rejected
   */
  async onCommitRejected(taskId: string): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task || task.status !== TaskStatus.REVIEW) return;

    await this.transitionTask(task, TaskStatus.IN_PROGRESS);
    console.log('[TaskTransition] Commit rejected, task → IN_PROGRESS');
  }

  /**
   * Helper: transition task and emit event
   */
  private async transitionTask(task: Task, newStatus: TaskStatus): Promise<void> {
    const oldStatus = task.status;
    task.updateStatus(newStatus);
    await this.taskRepo.save(task);

    this.eventBus.publish([
      new TaskStatusChangedEvent(task.id, task.projectId, oldStatus, newStatus)
    ]);
  }
}
