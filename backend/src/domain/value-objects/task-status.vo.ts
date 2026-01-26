/**
 * Task Status Value Object
 * Defines all status-related enums and types for the task domain
 */

export enum TaskStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum AgentRole {
  RESEARCHER = 'researcher',
  PLANNER = 'planner',
  CODER = 'coder',
  REVIEWER = 'reviewer',
  TESTER = 'tester',
}

export enum ProviderType {
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  OPENAI = 'openai',
}

export enum SessionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum WorkflowStage {
  PLANNING = 'planning',
  RESEARCH = 'research',
  IMPLEMENTATION = 'implementation',
  REVIEW = 'review',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
}
