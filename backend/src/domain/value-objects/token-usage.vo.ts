/**
 * Token Usage Value Object
 * Tracks token consumption and cost estimation
 */

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheCreation: number;
  readonly total: number;
  readonly estimatedCostUsd: number;
}

export interface ModelUsage {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
}

export interface ToolStats {
  readonly totalCalls: number;
  readonly totalSuccess: number;
  readonly byTool?: Record<string, { calls: number; success: number }>;
}

export function createEmptyTokenUsage(): TokenUsage {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheCreation: 0,
    total: 0,
    estimatedCostUsd: 0,
  };
}

export function createEmptyToolStats(): ToolStats {
  return {
    totalCalls: 0,
    totalSuccess: 0,
    byTool: {},
  };
}
