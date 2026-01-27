/**
 * Event Bus
 * In-memory event bus for domain events pub/sub
 */

import { TokenUsage } from '../value-objects/token-usage.vo.js';

// Base domain event interface
export interface DomainEvent {
  readonly type: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

// Session started event
export class SessionStartedEvent implements DomainEvent {
  readonly type = 'session.started';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly taskId: string | null,
    public readonly provider: string | null
  ) {}
}

// Session completed event
export class SessionCompletedEvent implements DomainEvent {
  readonly type = 'session.completed';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly tokenUsage: TokenUsage
  ) {}
}

// Session failed event
export class SessionFailedEvent implements DomainEvent {
  readonly type = 'session.failed';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly reason: string
  ) {}
}

// Approval pending event
export class ApprovalPendingEvent implements DomainEvent {
  readonly type = 'approval.pending';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly sessionId: string,
    public readonly toolName: string,
    public readonly timeoutAt: Date
  ) {}
}

// Git approval created event
export class GitApprovalCreatedEvent implements DomainEvent {
  readonly type = 'git:approval:created';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // approvalId
    public readonly projectId: string,
    public readonly taskId: string,
    public readonly commitMessage: string,
    public readonly filesChanged: string[],
    public readonly diffSummary: { files: number; additions: number; deletions: number }
  ) {}
}

// Git approval resolved event
export class GitApprovalResolvedEvent implements DomainEvent {
  readonly type = 'git:approval:resolved';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // approvalId
    public readonly projectId: string,
    public readonly status: 'approved' | 'rejected',
    public readonly commit?: { sha: string; message: string }
  ) {}
}

// Git branch created event
export class GitBranchCreatedEvent implements DomainEvent {
  readonly type = 'git:branch:created';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // taskId
    public readonly projectId: string,
    public readonly branchName: string,
    public readonly baseBranch: string
  ) {}
}

// Git branch deleted event
export class GitBranchDeletedEvent implements DomainEvent {
  readonly type = 'git:branch:deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // taskId
    public readonly projectId: string,
    public readonly branchName: string
  ) {}
}

// Task created event
export class TaskCreatedEvent implements DomainEvent {
  readonly type = 'task.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // taskId
    public readonly projectId: string,
    public readonly title: string
  ) {}
}

// Task status changed event
export class TaskStatusChangedEvent implements DomainEvent {
  readonly type = 'task.status.changed';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // taskId
    public readonly projectId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {}
}

// Tool execution event (before/after)
export class ToolExecutionEvent implements DomainEvent {
  readonly type: 'tool.before' | 'tool.after';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // sessionId
    public readonly projectId: string | null,
    public readonly toolName: string,
    public readonly phase: 'before' | 'after',
    public readonly toolInput?: Record<string, unknown>
  ) {
    this.type = `tool.${phase}` as 'tool.before' | 'tool.after';
  }
}

// Message event (before/after)
export class MessageEvent implements DomainEvent {
  readonly type: 'message.before' | 'message.after';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // sessionId
    public readonly projectId: string | null,
    public readonly phase: 'before' | 'after',
    public readonly role: string
  ) {
    this.type = `message.${phase}` as 'message.before' | 'message.after';
  }
}

// Approval resolved event
export class ApprovalResolvedEvent implements DomainEvent {
  readonly type = 'approval.resolved';
  readonly occurredAt = new Date();

  constructor(
    public readonly aggregateId: string, // approvalId
    public readonly sessionId: string,
    public readonly approved: boolean,
    public readonly toolName: string
  ) {}
}

// Event handler type
export type EventHandler = (event: DomainEvent) => void;

// Event bus interface
export interface IEventBus {
  /**
   * Publish one or more domain events
   */
  publish(events: DomainEvent[]): void;

  /**
   * Subscribe to events of a specific type
   * @returns Unsubscribe function
   */
  subscribe(type: string, handler: EventHandler): () => void;

  /**
   * Subscribe to all events (useful for SSE)
   * @returns Unsubscribe function
   */
  subscribeAll(handler: EventHandler): () => void;
}

// In-memory event bus implementation
export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private globalHandlers = new Set<EventHandler>();

  publish(events: DomainEvent[]): void {
    for (const event of events) {
      // Notify type-specific handlers
      const typeHandlers = this.handlers.get(event.type);
      if (typeHandlers) {
        typeHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Event handler error for ${event.type}:`, error);
          }
        });
      }

      // Notify global handlers (SSE)
      this.globalHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Global event handler error:', error);
        }
      });
    }
  }

  subscribe(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }
}

// Singleton instance for the app
let eventBusInstance: InMemoryEventBus | null = null;

export function getEventBus(): InMemoryEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new InMemoryEventBus();
  }
  return eventBusInstance;
}
