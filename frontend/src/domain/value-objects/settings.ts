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
  theme: 'light' | 'dark' | 'glass-light' | 'glass-dark';
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
  currentActiveProjectId?: string; // Default project for task creation
  dataRetentionEnabled?: boolean; // Enable auto-delete old tasks
  dataRetentionDays?: number; // Days before delete (default: 90)
  updatedAt: Date;
}
