/**
 * Provider-specific context window configurations
 * Must match backend configurations in context-window.vo.ts
 */

import type { ProviderType } from '@/domain/entities/task';

export interface ProviderContextConfig {
  contextSize: number;
  autocompactBuffer: number;
  warningThreshold: number;
  criticalThreshold: number;
  displayName: string;
}

export const PROVIDER_CONTEXT_CONFIG: Record<ProviderType, ProviderContextConfig> = {
  anthropic: {
    contextSize: 200000,
    autocompactBuffer: 45000,     // 22.5% reserved for Claude autocompact
    warningThreshold: 70,
    criticalThreshold: 85,
    displayName: 'Claude'
  },
  google: {
    contextSize: 1000000,          // Gemini 1.5/2.0
    autocompactBuffer: 50000,      // ~5% reserved
    warningThreshold: 80,
    criticalThreshold: 90,
    displayName: 'Gemini'
  },
  openai: {
    contextSize: 128000,           // GPT-4
    autocompactBuffer: 10000,      // ~8% reserved
    warningThreshold: 75,
    criticalThreshold: 90,
    displayName: 'GPT-4'
  }
};
