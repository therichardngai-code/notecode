/**
 * Context Window Value Object
 * Tracks conversation context usage for provider limits
 */

import { ProviderType } from './task-status.vo.js';

export interface ContextWindowUsage {
  readonly inputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;          // Tracked but not counted toward context
  readonly totalContextTokens: number;       // input + cacheCreation ONLY
  readonly contextSize: number;
  readonly contextPercent: number;
  readonly provider: ProviderType;
  readonly timestamp: Date;
}

export interface ProviderContextConfig {
  readonly contextSize: number;
  readonly autocompactBuffer: number;
  readonly warningThreshold: number;
  readonly criticalThreshold: number;
}

export const PROVIDER_CONTEXT_CONFIG: Record<ProviderType, ProviderContextConfig> = {
  [ProviderType.ANTHROPIC]: {
    contextSize: 200000,
    autocompactBuffer: 45000,      // Claude's autocompact buffer (22.5%)
    warningThreshold: 70,
    criticalThreshold: 85
  },
  [ProviderType.GOOGLE]: {
    contextSize: 1000000,           // Gemini 1.5/2.0
    autocompactBuffer: 50000,       // Estimated 5%
    warningThreshold: 80,
    criticalThreshold: 90
  },
  [ProviderType.OPENAI]: {
    contextSize: 128000,            // GPT-4
    autocompactBuffer: 10000,       // Estimated ~8%
    warningThreshold: 75,
    criticalThreshold: 90
  }
};

export function createEmptyContextWindow(provider: ProviderType): ContextWindowUsage {
  const config = PROVIDER_CONTEXT_CONFIG[provider];
  return {
    inputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalContextTokens: 0,
    contextSize: config.contextSize,
    contextPercent: 0,
    provider,
    timestamp: new Date()
  };
}
