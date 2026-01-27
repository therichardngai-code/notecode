/**
 * Hook Entity
 * Represents an event hook configuration for running custom actions
 */

// All supported hook events
export type HookEvent =
  | 'session:start'
  | 'session:end'
  | 'session:error'
  | 'message:before'
  | 'message:after'
  | 'tool:before'
  | 'tool:after'
  | 'task:created'
  | 'task:status:change'
  | 'approval:pending'
  | 'approval:resolved'
  | 'git:commit:created'
  | 'git:commit:approved';

export type HookType = 'shell' | 'http' | 'websocket';

// Shell command configuration
export interface ShellHookConfig {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number; // ms, default 30000
  blocking?: boolean; // If true, failure stops operation
}

// HTTP webhook configuration
export interface HttpHookConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number; // ms, default 10000
  blocking?: boolean;
}

// WebSocket push configuration
export interface WebSocketHookConfig {
  url: string;
  channel?: string;
}

export type HookConfig = ShellHookConfig | HttpHookConfig | WebSocketHookConfig;

// Filters to selectively trigger hooks
export interface HookFilters {
  toolNames?: string[]; // Only for tool:before/after events
  statuses?: string[]; // Only for task:status:change event
  providers?: string[]; // Filter by CLI provider
}

export class Hook {
  constructor(
    public readonly id: string,
    public readonly projectId: string | null,
    public readonly taskId: string | null,
    public name: string,
    public event: HookEvent,
    public type: HookType,
    public config: HookConfig,
    public filters: HookFilters | null,
    public enabled: boolean,
    public priority: number,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(
    id: string,
    projectId: string | null,
    taskId: string | null,
    name: string,
    event: HookEvent,
    type: HookType,
    config: HookConfig,
    filters: HookFilters | null = null,
    priority: number = 0
  ): Hook {
    const now = new Date();
    return new Hook(
      id,
      projectId,
      taskId,
      name,
      event,
      type,
      config,
      filters,
      true,
      priority,
      now,
      now
    );
  }

  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date();
  }

  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date();
  }

  updateConfig(config: HookConfig): void {
    this.config = config;
    this.updatedAt = new Date();
  }

  updateFilters(filters: HookFilters | null): void {
    this.filters = filters;
    this.updatedAt = new Date();
  }

  isBlocking(): boolean {
    if (this.type === 'websocket') return false;
    return (this.config as ShellHookConfig | HttpHookConfig).blocking === true;
  }

  matchesFilters(context: HookFilterContext): boolean {
    if (!this.filters) return true;

    if (this.filters.toolNames?.length && context.toolName) {
      if (!this.filters.toolNames.includes(context.toolName)) return false;
    }

    if (this.filters.statuses?.length && context.status) {
      if (!this.filters.statuses.includes(context.status)) return false;
    }

    if (this.filters.providers?.length && context.provider) {
      if (!this.filters.providers.includes(context.provider)) return false;
    }

    return true;
  }
}

// Context used for filter matching
export interface HookFilterContext {
  toolName?: string;
  status?: string;
  provider?: string;
}
