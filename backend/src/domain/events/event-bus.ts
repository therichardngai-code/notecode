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
