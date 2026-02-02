/**
 * Approval Gate Constants
 * Shared constants for approval gate configuration across settings components
 */

/**
 * Built-in dangerous patterns that are always active when approval gate is enabled
 * These patterns are hardcoded in the backend and cannot be modified by users
 */
export const BUILTIN_PATTERNS = {
  /** Dangerous bash command patterns (regex) */
  commands: [
    'rm\\s+-rf',
    'rm\\s+-r',
    'DROP\\s+TABLE',
    'git\\s+push.*--force',
    'git\\s+reset.*--hard',
    'chmod\\s+777',
  ],
  /** Dangerous file path patterns (regex) */
  files: [
    '\\.env$',
    '\\.env\\.',
    'credentials',
    'secrets?\\.json',
    '\\.pem$',
    '\\.key$',
    'id_rsa',
  ],
} as const;

/**
 * Available tools that can be configured with approval rules
 * These match the tool names from the AI provider (Anthropic Claude, etc.)
 */
export const AVAILABLE_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Bash',
  'NotebookEdit',
  'WebSearch',
  'WebFetch',
  'TaskCreate',
  'TaskUpdate',
  'TaskList',
  'TaskGet',
] as const;

/** Type for available tool names */
export type AvailableTool = (typeof AVAILABLE_TOOLS)[number];

/** Type for tool rule actions */
export type ToolRuleAction = 'approve' | 'deny' | 'ask';
