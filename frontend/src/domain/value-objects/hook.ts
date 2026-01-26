import type { ProviderType } from '../entities/task';

export type HookEvent =
  | 'session:start'
  | 'session:end'
  | 'message:before'
  | 'message:after'
  | 'tool:before'
  | 'tool:after'
  | 'approval:pending';

export type HookType = 'script' | 'memory-inject' | 'context-inject';

export interface Hook {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  event: HookEvent;
  type: HookType;
  script?: string;
  config?: Record<string, unknown>;
  providers: ProviderType[];
  createdAt: Date;
  updatedAt: Date;
}
