/**
 * Task Entity
 * Represents a development task with status management and business logic
 */

import {
  TaskStatus,
  TaskPriority,
  AgentRole,
  ProviderType,
} from '../value-objects/task-status.vo.js';

export interface ToolConfig {
  mode: 'allowlist' | 'blocklist';
  tools: string[];
}

export interface TaskGitConfig {
  autoBranch: boolean;
  autoCommit: boolean;
  branchName: string | null;
  baseBranch: string | null;
  branchCreatedAt: Date | null;
}

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';

export class Task {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public agentId: string | null,
    public parentId: string | null, // For subtasks
    public dependencies: string[], // Task IDs that must complete first
    public title: string,
    public description: string,
    public status: TaskStatus,
    public priority: TaskPriority,
    public assignee: string | null,
    public dueDate: Date | null,
    public agentRole: AgentRole | null,
    public provider: ProviderType | null,
    public model: string | null,
    public skills: string[],
    public tools: ToolConfig | null,
    public contextFiles: string[],
    public workflowStage: string | null,
    public subagentDelegates: boolean, // Enable Task tool + custom agents
    // Git config
    public autoBranch: boolean,
    public autoCommit: boolean,
    public branchName: string | null,
    public baseBranch: string | null,
    public branchCreatedAt: Date | null,
    public permissionMode: PermissionMode | null,
    // Attempt tracking
    public totalAttempts: number,
    public renewCount: number,
    public retryCount: number,
    public forkCount: number,
    public lastAttemptAt: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public startedAt: Date | null,
    public completedAt: Date | null
  ) {}

  /**
   * Record a new session attempt
   */
  recordAttempt(mode: 'renew' | 'retry' | 'fork' | null): void {
    this.totalAttempts++;
    this.lastAttemptAt = new Date();
    this.updatedAt = new Date();

    if (mode === 'renew') {
      this.renewCount++;
    } else if (mode === 'retry') {
      this.retryCount++;
    } else if (mode === 'fork') {
      this.forkCount++;
    }
    // null mode = first attempt, don't increment any specific counter
  }

  canStart(): boolean {
    return this.status === TaskStatus.NOT_STARTED;
  }

  canTransitionTo(newStatus: TaskStatus): boolean {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.NOT_STARTED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [
        TaskStatus.REVIEW,
        TaskStatus.DONE,
        TaskStatus.CANCELLED,
      ],
      [TaskStatus.REVIEW]: [
        TaskStatus.IN_PROGRESS,
        TaskStatus.DONE,
        TaskStatus.CANCELLED,
      ],
      [TaskStatus.DONE]: [TaskStatus.ARCHIVED],
      [TaskStatus.CANCELLED]: [TaskStatus.ARCHIVED],
      [TaskStatus.ARCHIVED]: [],
    };
    return validTransitions[this.status].includes(newStatus);
  }

  start(): void {
    if (!this.canStart()) {
      throw new Error('Task cannot be started');
    }
    this.status = TaskStatus.IN_PROGRESS;
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  complete(): void {
    if (!this.canTransitionTo(TaskStatus.DONE)) {
      throw new Error('Task cannot be completed from current status');
    }
    this.status = TaskStatus.DONE;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: TaskStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Invalid transition from ${this.status} to ${newStatus}`);
    }
    this.status = newStatus;
    this.updatedAt = new Date();

    if (newStatus === TaskStatus.IN_PROGRESS && !this.startedAt) {
      this.startedAt = new Date();
    }
    if (newStatus === TaskStatus.DONE || newStatus === TaskStatus.CANCELLED) {
      this.completedAt = new Date();
    }
  }

  updateTitle(title: string): void {
    if (!title.trim()) {
      throw new Error('Task title cannot be empty');
    }
    this.title = title.trim();
    this.updatedAt = new Date();
  }

  updateDescription(description: string): void {
    this.description = description;
    this.updatedAt = new Date();
  }

  updatePriority(priority: TaskPriority): void {
    this.priority = priority;
    this.updatedAt = new Date();
  }

  assignAgent(agentId: string | null): void {
    this.agentId = agentId;
    this.updatedAt = new Date();
  }

  setAgentConfiguration(
    role: AgentRole | null,
    provider: ProviderType | null,
    model: string | null
  ): void {
    this.agentRole = role;
    this.provider = provider;
    this.model = model;
    this.updatedAt = new Date();
  }

  setSkills(skills: string[]): void {
    this.skills = skills;
    this.updatedAt = new Date();
  }

  setTools(tools: ToolConfig | null): void {
    this.tools = tools;
    this.updatedAt = new Date();
  }

  setContextFiles(files: string[]): void {
    this.contextFiles = files;
    this.updatedAt = new Date();
  }

  /**
   * Set git configuration
   */
  setGitConfig(autoBranch: boolean, autoCommit: boolean): void {
    this.autoBranch = autoBranch;
    this.autoCommit = autoCommit;
    this.updatedAt = new Date();
  }

  /**
   * Set branch info after branch creation
   */
  setBranchInfo(branchName: string, baseBranch: string): void {
    this.branchName = branchName;
    this.baseBranch = baseBranch;
    this.branchCreatedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Clear branch info after branch deletion
   */
  clearBranchInfo(): void {
    this.branchName = null;
    this.baseBranch = null;
    this.branchCreatedAt = null;
    this.updatedAt = new Date();
  }

  /**
   * Generate branch name from task id and title
   */
  generateBranchName(): string {
    const shortId = this.id.slice(0, 8);
    const slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    return `task/${shortId}-${slug}`;
  }

  /**
   * Check if task has git branch configured
   */
  hasBranch(): boolean {
    return this.branchName !== null;
  }

  /**
   * Get git config as object
   */
  getGitConfig(): TaskGitConfig {
    return {
      autoBranch: this.autoBranch,
      autoCommit: this.autoCommit,
      branchName: this.branchName,
      baseBranch: this.baseBranch,
      branchCreatedAt: this.branchCreatedAt,
    };
  }
}
