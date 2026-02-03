/**
 * Database Schema
 * Drizzle ORM schema definitions for SQLite
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Projects table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path').unique().notNull(),
  systemPrompt: text('system_prompt'), // Per-project system prompt override
  approvalGate: text('approval_gate'), // JSON ApprovalGateConfig - project override
  isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  lastAccessedAt: text('last_accessed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Agents table (persistent identity)
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  description: text('description'),
  focusAreas: text('focus_areas'), // JSON array
  defaultSkills: text('default_skills'), // JSON array
  defaultTools: text('default_tools'), // JSON object
  injectPreviousSummaries: integer('inject_previous_summaries', { mode: 'boolean' }).default(true),
  maxSummariesToInject: integer('max_summaries_to_inject').default(5),
  totalSessions: integer('total_sessions').default(0),
  totalTokensUsed: integer('total_tokens_used').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Agent summaries table (extended for memory extraction)
export const agentSummaries = sqliteTable('agent_summaries', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  sessionId: text('session_id').notNull(),
  summary: text('summary').notNull(),
  keyDecisions: text('key_decisions'), // JSON array
  filesModified: text('files_modified'), // JSON array
  tokenCount: integer('token_count').default(0),
  extractedAt: text('extracted_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tasks table
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  parentId: text('parent_id'), // Self-reference for subtasks (FK added via index)
  dependencies: text('dependencies'), // JSON array of task IDs that must complete first
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('not-started'),
  priority: text('priority').default('medium'),
  assignee: text('assignee'),
  dueDate: text('due_date'),
  agentRole: text('agent_role'),
  provider: text('provider'),
  model: text('model'),
  skills: text('skills'), // JSON array
  tools: text('tools'), // JSON object {mode, tools[]}
  contextFiles: text('context_files'), // JSON array
  workflowStage: text('workflow_stage'),
  subagentDelegates: integer('subagent_delegates', { mode: 'boolean' }).default(false), // Enable Task tool + custom agents
  // Git config
  autoBranch: integer('auto_branch', { mode: 'boolean' }).default(false), // Auto-create branch on task start
  autoCommit: integer('auto_commit', { mode: 'boolean' }).default(false), // Auto-commit on task complete
  branchName: text('branch_name'), // Created branch name
  baseBranch: text('base_branch'), // Branch forked from
  branchCreatedAt: text('branch_created_at'), // When branch was created
  permissionMode: text('permission_mode'), // 'default' | 'acceptEdits' | 'bypassPermissions'
  // Attempt tracking
  totalAttempts: integer('total_attempts').default(0),
  renewCount: integer('renew_count').default(0),
  retryCount: integer('retry_count').default(0),
  forkCount: integer('fork_count').default(0),
  lastAttemptAt: text('last_attempt_at'),
  // Conversation continuity - tracks last CLI session ID for resume
  lastProviderSessionId: text('last_provider_session_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  parentSessionId: text('parent_session_id'), // For session forking/resume
  providerSessionId: text('provider_session_id'),
  resumeMode: text('resume_mode'), // 'renew' | 'retry' | 'fork' | null (first run)
  attemptNumber: integer('attempt_number').default(1), // Which attempt (1st, 2nd, 3rd...)
  resumedFromSessionId: text('resumed_from_session_id'), // Direct link to source session
  initialPrompt: text('initial_prompt'), // User's prompt for this session (for retry persistence)
  name: text('name'),
  status: text('status').default('queued'),
  provider: text('provider'),
  processId: integer('process_id'),
  workingDir: text('working_dir'),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  durationMs: integer('duration_ms'),
  tokenInput: integer('token_input').default(0),
  tokenOutput: integer('token_output').default(0),
  tokenCacheRead: integer('token_cache_read').default(0),
  tokenCacheCreation: integer('token_cache_creation').default(0),
  tokenTotal: integer('token_total').default(0),
  estimatedCostUsd: real('estimated_cost_usd').default(0),
  modelUsage: text('model_usage'), // JSON array
  toolStats: text('tool_stats'), // JSON object
  // Context tracking for delta injection on resume
  includedContextFiles: text('included_context_files'), // JSON array - files included at last message
  includedSkills: text('included_skills'), // JSON array - skills included at last message
  // Context window tracking
  contextWindowData: text('context_window_data'), // JSON object - CLI context_window data
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  blocks: text('blocks').notNull(), // JSON array of Block types
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  tokenCount: integer('token_count'),
  toolName: text('tool_name'),
  toolInput: text('tool_input'), // JSON
  toolResult: text('tool_result'),
  approvalId: text('approval_id'), // Link to approval if tool required approval
  // Streaming support
  status: text('status').default('complete'), // 'streaming' | 'complete'
  streamOffset: integer('stream_offset').default(0), // Current content length for delta sync
});

// Settings table (singleton)
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('global'),
  userName: text('user_name'),
  userEmail: text('user_email'),
  theme: text('theme').default('system'),
  defaultProvider: text('default_provider'),
  defaultModel: text('default_model'),
  fallbackModel: text('fallback_model'), // Fallback model when primary fails
  systemPrompt: text('system_prompt'), // Global default system prompt
  apiKeys: text('api_keys'), // Encrypted JSON
  yoloMode: integer('yolo_mode', { mode: 'boolean' }).default(false),
  approvalGate: text('approval_gate'), // JSON ApprovalGateConfig
  autoExtractSummary: integer('auto_extract_summary', { mode: 'boolean' }).default(true),
  currentActiveProjectId: text('current_active_project_id').references(() => projects.id, { onDelete: 'set null' }),
  dataRetentionEnabled: integer('data_retention_enabled', { mode: 'boolean' }).default(false),
  dataRetentionDays: integer('data_retention_days').default(90), // Days before auto-delete inactive tasks
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Approvals table
export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // 'diff' | 'tool' | 'command'
  payload: text('payload').notNull(), // JSON ApprovalPayload
  toolCategory: text('tool_category').default('requires-approval'), // 'safe' | 'requires-approval' | 'dangerous'
  matchedPattern: text('matched_pattern'),
  status: text('status').default('pending'), // 'pending' | 'approved' | 'rejected' | 'timeout'
  timeoutAt: text('timeout_at').notNull(),
  autoAction: text('auto_action').default('deny'), // 'approve' | 'deny'
  decidedAt: text('decided_at'),
  decidedBy: text('decided_by'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Diffs table (for file change tracking)
export const diffs = sqliteTable('diffs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  toolUseId: text('tool_use_id').notNull(),
  approvalId: text('approval_id').references(() => approvals.id, { onDelete: 'set null' }),
  filePath: text('file_path').notNull(),
  operation: text('operation').notNull(), // 'edit' | 'write' | 'delete'
  oldContent: text('old_content'),
  newContent: text('new_content'),
  fullContent: text('full_content'),
  lineStart: integer('line_start'),
  lineEnd: integer('line_end'),
  hunks: text('hunks'), // JSON DiffHunk[]
  status: text('status').default('pending'), // 'pending' | 'approved' | 'rejected' | 'applied'
  appliedAt: text('applied_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Audit logs table (tracks all entity changes)
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'task' | 'session' | 'message' | 'approval' | 'project'
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'create' | 'update' | 'delete'
  changes: text('changes'), // JSON: { field: { old: value, new: value } }
  performedBy: text('performed_by'), // User or agent ID
  sessionId: text('session_id'), // Context session if applicable
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Hooks table (event-driven extensibility)
export const hooks = sqliteTable('hooks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  event: text('event').notNull(),
  type: text('type').notNull(),
  config: text('config').notNull(), // JSON HookConfig
  filters: text('filters'), // JSON HookFilters
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  priority: integer('priority').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Git commit approvals table
export const gitCommitApprovals = sqliteTable('git_commit_approvals', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'set null' }), // Link to session for batch diff operations
  attemptNumber: integer('attempt_number').default(1),
  status: text('status').default('pending'), // 'pending' | 'approved' | 'rejected'
  commitMessage: text('commit_message'),
  filesChanged: text('files_changed'), // JSON array
  diffSummary: text('diff_summary'), // JSON object
  commitSha: text('commit_sha'),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
  pushedAt: text('pushed_at'), // When commit was pushed (future)
});

// CLI Provider Hooks table (for Claude, Gemini, Codex, etc.)
export const cliProviderHooks = sqliteTable('cli_provider_hooks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'claude' | 'gemini' | 'codex' | etc.
  name: text('name').notNull(), // Hook filename without extension (e.g., 'approval-gate')
  hookType: text('hook_type').notNull(), // Provider-specific type (e.g., 'PreToolUse', 'PostToolUse')
  script: text('script').notNull(), // The actual JS/CJS code
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  scope: text('scope').default('project'), // 'project' | 'global'
  matcher: text('matcher'), // Optional: tool matcher (e.g., 'Write|Edit|Bash')
  timeout: integer('timeout'), // Optional: timeout in seconds
  syncedAt: text('synced_at'), // When last written to filesystem
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// CLI Provider Settings table (settings.json per provider)
export const cliProviderSettings = sqliteTable('cli_provider_settings', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'claude' | 'gemini' | 'codex' | etc.
  settings: text('settings').notNull(), // JSON settings content
  scope: text('scope').default('project'), // 'project' | 'global'
  syncedAt: text('synced_at'), // When last written to filesystem
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Type exports for schema inference
export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;
export type ApprovalRow = typeof approvals.$inferSelect;
export type NewApprovalRow = typeof approvals.$inferInsert;
export type DiffRow = typeof diffs.$inferSelect;
export type NewDiffRow = typeof diffs.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
export type GitCommitApprovalRow = typeof gitCommitApprovals.$inferSelect;
export type NewGitCommitApprovalRow = typeof gitCommitApprovals.$inferInsert;
export type HookRow = typeof hooks.$inferSelect;
export type NewHookRow = typeof hooks.$inferInsert;
export type CliProviderHookRow = typeof cliProviderHooks.$inferSelect;
export type NewCliProviderHookRow = typeof cliProviderHooks.$inferInsert;
export type CliProviderSettingsRow = typeof cliProviderSettings.$inferSelect;
export type NewCliProviderSettingsRow = typeof cliProviderSettings.$inferInsert;
