export type TaskStatus =
  | 'not-started'
  | 'in-progress'
  | 'review'
  | 'done'
  | 'cancelled'
  | 'archived';

export type TaskPriority = 'high' | 'medium' | 'low';

export type AgentType =
  | 'researcher'
  | 'planner'
  | 'coder'
  | 'reviewer'
  | 'tester';

export type ProviderType = 'anthropic' | 'google' | 'openai';

export type WorkflowStage =
  | 'research'
  | 'plan'
  | 'code'
  | 'test'
  | 'review'
  | 'document'
  | 'commit';

export interface ToolConfig {
  mode: 'allowlist' | 'blocklist';
  tools: string[];
}

export interface Task {
  id: string;
  projectId: string;
  agentId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: Date;
  agentRole: AgentType;
  provider: ProviderType;
  model: string;
  skills: string[];
  tools: ToolConfig;
  contextFiles: string[];
  workflowStage?: WorkflowStage;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
