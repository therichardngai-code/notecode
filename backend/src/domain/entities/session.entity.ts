/**
 * Session Entity
 * Represents a CLI session with lifecycle management and usage tracking
 */

import { SessionStatus, ProviderType } from '../value-objects/task-status.vo.js';
import {
  TokenUsage,
  ModelUsage,
  ToolStats,
  createEmptyTokenUsage,
  createEmptyToolStats,
} from '../value-objects/token-usage.vo.js';
import { ContextWindowUsage } from '../value-objects/context-window.vo.js';

export interface DomainEvent {
  readonly type: string;
  readonly timestamp: Date;
}

export class SessionStartedEvent implements DomainEvent {
  readonly type = 'SessionStarted';
  readonly timestamp = new Date();
  constructor(public readonly sessionId: string) {}
}

export class SessionCompletedEvent implements DomainEvent {
  readonly type = 'SessionCompleted';
  readonly timestamp = new Date();
  constructor(
    public readonly sessionId: string,
    public readonly tokenUsage: TokenUsage
  ) {}
}

export type ResumeMode = 'renew' | 'retry' | 'fork';

export class Session {
  private _events: DomainEvent[] = [];

  constructor(
    public readonly id: string,
    public readonly taskId: string,
    public agentId: string | null,
    public parentSessionId: string | null, // For session forking/resume
    public providerSessionId: string | null,
    public resumeMode: ResumeMode | null, // Mode used to create this session
    public attemptNumber: number, // Which attempt (1, 2, 3...)
    public resumedFromSessionId: string | null, // Direct link to source session
    public initialPrompt: string | null, // User's prompt for this session (persists for retry)
    public name: string,
    public status: SessionStatus,
    public provider: ProviderType | null,
    public processId: number | null,
    public workingDir: string,
    public startedAt: Date | null,
    public endedAt: Date | null,
    public durationMs: number | null,
    public tokenUsage: TokenUsage,
    public modelUsage: ModelUsage[],
    public toolStats: ToolStats,
    // Context tracking for delta injection on resume
    public includedContextFiles: string[],
    public includedSkills: string[],
    // Context window tracking
    public contextWindow: ContextWindowUsage | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(
    id: string,
    taskId: string,
    name: string,
    provider: ProviderType | null,
    workingDir: string,
    agentId: string | null = null,
    parentSessionId: string | null = null,
    resumeMode: ResumeMode | null = null,
    attemptNumber: number = 1,
    resumedFromSessionId: string | null = null,
    initialPrompt: string | null = null,
    includedContextFiles: string[] = [],
    includedSkills: string[] = []
  ): Session {
    const now = new Date();
    return new Session(
      id,
      taskId,
      agentId,
      parentSessionId,
      null,
      resumeMode,
      attemptNumber,
      resumedFromSessionId,
      initialPrompt,
      name,
      SessionStatus.QUEUED,
      provider,
      null,
      workingDir,
      null,
      null,
      null,
      createEmptyTokenUsage(),
      [],
      createEmptyToolStats(),
      includedContextFiles,
      includedSkills,
      null, // contextWindow - set later when CLI reports
      now,
      now
    );
  }

  canStart(): boolean {
    return this.status === SessionStatus.QUEUED;
  }

  canPause(): boolean {
    return this.status === SessionStatus.RUNNING;
  }

  canResume(): boolean {
    return this.status === SessionStatus.PAUSED;
  }

  canStop(): boolean {
    return (
      this.status === SessionStatus.RUNNING ||
      this.status === SessionStatus.PAUSED
    );
  }

  start(providerSessionId: string, processId: number): void {
    if (!this.canStart()) {
      throw new Error('Session cannot be started');
    }
    this.status = SessionStatus.RUNNING;
    // Only set providerSessionId if not already inherited from parent session
    if (!this.providerSessionId) {
      this.providerSessionId = providerSessionId;
    }
    this.processId = processId;
    this.startedAt = new Date();
    this.updatedAt = new Date();
    this._events.push(new SessionStartedEvent(this.id));
  }

  pause(): void {
    if (!this.canPause()) {
      throw new Error('Session cannot be paused');
    }
    this.status = SessionStatus.PAUSED;
    this.updatedAt = new Date();
  }

  resume(): void {
    if (!this.canResume()) {
      throw new Error('Session cannot be resumed');
    }
    this.status = SessionStatus.RUNNING;
    this.updatedAt = new Date();
  }

  complete(usage: TokenUsage, modelUsage: ModelUsage[]): void {
    if (this.status !== SessionStatus.RUNNING) {
      throw new Error('Only running sessions can be completed');
    }
    this.status = SessionStatus.COMPLETED;
    this.endedAt = new Date();
    this.durationMs = this.endedAt.getTime() - (this.startedAt?.getTime() ?? 0);
    this.tokenUsage = usage;
    this.modelUsage = modelUsage;
    this.updatedAt = new Date();
    this._events.push(new SessionCompletedEvent(this.id, usage));
  }

  fail(_reason?: string): void {
    this.status = SessionStatus.FAILED;
    this.endedAt = new Date();
    this.durationMs = this.endedAt.getTime() - (this.startedAt?.getTime() ?? 0);
    this.updatedAt = new Date();
  }

  cancel(): void {
    if (!this.canStop()) {
      throw new Error('Session cannot be cancelled');
    }
    this.status = SessionStatus.CANCELLED;
    this.endedAt = new Date();
    this.durationMs = this.endedAt.getTime() - (this.startedAt?.getTime() ?? 0);
    this.updatedAt = new Date();
  }

  updateTokenUsage(usage: TokenUsage): void {
    this.tokenUsage = usage;
    this.updatedAt = new Date();
  }

  updateToolStats(stats: ToolStats): void {
    this.toolStats = stats;
    this.updatedAt = new Date();
  }

  updateContextWindow(contextWindow: ContextWindowUsage): void {
    this.contextWindow = contextWindow;
    this.updatedAt = new Date();
  }

  get events(): DomainEvent[] {
    return [...this._events];
  }

  clearEvents(): void {
    this._events = [];
  }
}
