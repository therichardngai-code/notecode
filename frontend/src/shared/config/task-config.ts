// Shared task configuration - single source of truth for columns, statuses, priorities

// ============================================
// SESSION STATUS CONFIG (CLI execution state)
// ============================================
export type SessionStatusId = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export const sessionStatusConfig: Record<SessionStatusId, { label: string; color: string; bgColor: string }> = {
  'queued': { label: 'Queued', color: '#787774', bgColor: 'rgba(120, 119, 116, 0.15)' },
  'running': { label: 'Running', color: '#447FC1', bgColor: 'rgba(68, 127, 193, 0.15)' },
  'paused': { label: 'Paused', color: '#C69F3A', bgColor: 'rgba(198, 159, 58, 0.15)' },
  'completed': { label: 'Completed', color: '#4B9064', bgColor: 'rgba(75, 144, 100, 0.15)' },
  'failed': { label: 'Failed', color: '#C15746', bgColor: 'rgba(193, 87, 70, 0.15)' },
  'cancelled': { label: 'Cancelled', color: '#55534E', bgColor: 'rgba(85, 83, 78, 0.15)' },
};

export const sessionStatusFilterOptions = [
  { id: 'all' as const, label: 'All', color: 'transparent' },
  { id: 'running' as const, label: 'Running', color: '#447FC1' },
  { id: 'paused' as const, label: 'Paused', color: '#C69F3A' },
  { id: 'completed' as const, label: 'Completed', color: '#4B9064' },
  { id: 'queued' as const, label: 'Queued', color: '#787774' },
  { id: 'failed' as const, label: 'Failed', color: '#C15746' },
  { id: 'cancelled' as const, label: 'Cancelled', color: '#55534E' },
];

export type SessionStatusFilterId = (typeof sessionStatusFilterOptions)[number]['id'];

// ============================================
// TASK STATUS CONFIG (workflow state)
// ============================================
export const columnDefs = [
  { id: 'not-started', title: 'Not Started', color: '#787774' },
  { id: 'in-progress', title: 'In Progress', color: '#447FC1' },
  { id: 'review', title: 'Review', color: '#C69F3A' },
  { id: 'done', title: 'Done', color: '#4B9064' },
  { id: 'cancelled', title: 'Cancelled', color: '#C15746' },
  { id: 'archived', title: 'Archived', color: '#55534E' },
] as const;

export type ColumnId = (typeof columnDefs)[number]['id'];
export type StatusId = ColumnId; // Alias for clarity

export const statusConfig: Record<StatusId, { label: string; color: string; bgColor: string }> = {
  'not-started': { label: 'Not Started', color: '#787774', bgColor: 'rgba(120, 119, 116, 0.15)' },
  'in-progress': { label: 'In Progress', color: '#447FC1', bgColor: 'rgba(68, 127, 193, 0.15)' },
  'review': { label: 'Review', color: '#C69F3A', bgColor: 'rgba(198, 159, 58, 0.15)' },
  'done': { label: 'Done', color: '#4B9064', bgColor: 'rgba(75, 144, 100, 0.15)' },
  'cancelled': { label: 'Cancelled', color: '#C15746', bgColor: 'rgba(193, 87, 70, 0.15)' },
  'archived': { label: 'Archived', color: '#55534E', bgColor: 'rgba(85, 83, 78, 0.15)' },
};

export const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High', color: '#C15746', bgColor: 'rgba(193, 87, 70, 0.15)' },
  medium: { label: 'Medium', color: '#C69F3A', bgColor: 'rgba(198, 159, 58, 0.15)' },
  low: { label: 'Low', color: '#447FC1', bgColor: 'rgba(68, 127, 193, 0.15)' },
};

export const statusFilterOptions = [
  { id: 'all' as const, label: 'All', color: 'transparent' },
  { id: 'in-progress' as const, label: 'In Progress', color: '#447FC1' },
  { id: 'review' as const, label: 'Review', color: '#C69F3A' },
  { id: 'done' as const, label: 'Done', color: '#4B9064' },
  { id: 'archived' as const, label: 'Archived', color: '#55534E' },
];

export type StatusFilterId = (typeof statusFilterOptions)[number]['id'];

// Filter options for TasksView
export const filterOptions = {
  project: [
    { id: 'notecode', label: 'notecode' },
    { id: 'gemkit-cli', label: 'gemkit-cli' },
    { id: 'ai-dashboard', label: 'ai-dashboard' },
  ],
  agent: [
    { id: 'researcher', label: 'Researcher' },
    { id: 'planner', label: 'Planner' },
    { id: 'coder', label: 'Coder' },
    { id: 'reviewer', label: 'Reviewer' },
    { id: 'tester', label: 'Tester' },
  ],
  provider: [
    { id: 'anthropic', label: 'Claude (Anthropic)' },
    { id: 'google', label: 'Gemini (Google)' },
    { id: 'openai', label: 'Codex (OpenAI)' },
  ],
  model: [
    { id: 'claude-opus', label: 'Claude Opus 4' },
    { id: 'claude-sonnet', label: 'Claude Sonnet 4' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-3-pro', label: 'Gemini 3 Pro' },
    { id: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
  ],
  priority: [
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' },
  ],
  taskStatus: [
    { id: 'not-started', label: 'Not Started' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'archived', label: 'Archived' },
  ],
  sessionStatus: [
    { id: 'queued', label: 'Queued' },
    { id: 'running', label: 'Running' },
    { id: 'paused', label: 'Paused' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed', label: 'Failed' },
    { id: 'cancelled', label: 'Cancelled' },
  ],
};
