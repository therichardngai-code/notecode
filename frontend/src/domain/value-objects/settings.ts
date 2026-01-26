import type { ProviderType } from '../entities/task';

export interface ApprovalGateConfig {
  enabled: boolean;
  timeoutSeconds: number;
  defaultOnTimeout: 'approve' | 'deny';
  autoAllowTools: string[];
  requireApprovalTools: string[];
  dangerousPatterns: {
    commands: string[];
    files: string[];
  };
}

export interface GlobalSettings {
  id: 'global';
  userName: string;
  theme: 'light' | 'dark' | 'system';
  defaultProvider: ProviderType;
  defaultModel: string;
  apiKeys: {
    anthropic?: string;
    google?: string;
    openai?: string;
  };
  yoloMode: boolean;
  approvalGate: ApprovalGateConfig;
  autoExtractSummary: boolean;
  updatedAt: Date;
}
