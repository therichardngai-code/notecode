import type { ProviderType } from './task';

export type SessionStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'archived';

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  total: number;
  estimatedCostUsd: number;
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  costUsd: number;
}

export interface ToolStats {
  totalCalls: number;
  totalSuccess: number;
  webSearchRequests: number;
  webFetchRequests: number;
}

export interface ContextWindowUsage {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalContextTokens: number;
  contextSize: number;
  contextPercent: number;
  provider: ProviderType;
  timestamp: string;
}

export interface Session {
  id: string;
  taskId: string;
  agentId?: string;
  providerSessionId?: string;
  providerMessageUuid?: string;
  name: string;
  status: SessionStatus;
  provider: ProviderType;
  cliCommand: string;
  processId?: number;
  workingDir: string;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
  durationApiMs?: number;
  tokenUsage: TokenUsage;
  modelUsage: ModelUsage[];
  toolStats: ToolStats;
  contextWindow?: ContextWindowUsage;
  createdAt: Date;
  updatedAt: Date;
}
