import type { AgentType, ToolConfig } from './task';

export interface Agent {
  id: string;
  projectId?: string;
  name: string;
  role: AgentType;
  description?: string;
  focusAreas: string[];
  defaultSkills: string[];
  defaultTools: ToolConfig;
  injectPreviousSummaries: boolean;
  maxSummariesToInject: number;
  totalSessions: number;
  totalTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSummary {
  id: string;
  agentId: string;
  sessionId: string;
  summary: string;
  keyDecisions: string[];
  filesModified: string[];
  tokenCount: number;
  extractedAt: Date;
  createdAt: Date;
}
