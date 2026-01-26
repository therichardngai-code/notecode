/**
 * Approval Gate Configuration Value Object
 * Defines tool categorization and approval settings
 */

export interface ApprovalGateConfig {
  enabled: boolean;
  timeoutSeconds: number;
  defaultOnTimeout: 'approve' | 'deny';

  // Tool categorization
  autoAllowTools: string[];
  requireApprovalTools: string[];

  // Dangerous patterns
  dangerousPatterns: {
    commands: string[];  // Regex patterns
    files: string[];     // Regex patterns
  };
}

/**
 * Default approval gate configuration
 * - Safe read-only tools are auto-approved
 * - Write/Edit/Bash tools require approval
 * - Known dangerous patterns (rm -rf, .env, etc.) flagged as dangerous
 */
export const DEFAULT_APPROVAL_GATE: ApprovalGateConfig = {
  enabled: true,
  timeoutSeconds: 30,
  defaultOnTimeout: 'deny',

  autoAllowTools: [
    'Read',
    'Glob',
    'Grep',
    'WebSearch',
    'WebFetch',
    'TaskList',
    'TaskGet',
  ],

  requireApprovalTools: [
    'Write',
    'Edit',
    'NotebookEdit',
    'Bash',
    'TaskCreate',
    'TaskUpdate',
  ],

  dangerousPatterns: {
    commands: [
      'rm\\s+-rf',
      'rm\\s+-r',
      'rmdir',
      'del\\s+/s',
      'DROP\\s+TABLE',
      'DELETE\\s+FROM.*WHERE.*1.*=.*1',
      'git\\s+push.*--force',
      'git\\s+reset.*--hard',
      'chmod\\s+777',
      'curl.*\\|.*sh',
      'wget.*\\|.*sh',
    ],
    files: [
      '\\.env$',
      '\\.env\\.',
      'credentials',
      'secrets?\\.json',
      'password',
      '\\.pem$',
      '\\.key$',
      'id_rsa',
      '\\.ssh/',
      '\\.aws/',
      '\\.npmrc',
      '\\.pypirc',
    ],
  },
};

/**
 * Validate ApprovalGateConfig structure
 */
export function isValidApprovalGateConfig(config: unknown): config is ApprovalGateConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;

  return (
    typeof c.enabled === 'boolean' &&
    typeof c.timeoutSeconds === 'number' &&
    (c.defaultOnTimeout === 'approve' || c.defaultOnTimeout === 'deny') &&
    Array.isArray(c.autoAllowTools) &&
    Array.isArray(c.requireApprovalTools) &&
    typeof c.dangerousPatterns === 'object' &&
    c.dangerousPatterns !== null
  );
}

/**
 * Merge partial config with defaults
 */
export function mergeApprovalGateConfig(
  partial: Partial<ApprovalGateConfig>
): ApprovalGateConfig {
  return {
    enabled: partial.enabled ?? DEFAULT_APPROVAL_GATE.enabled,
    timeoutSeconds: partial.timeoutSeconds ?? DEFAULT_APPROVAL_GATE.timeoutSeconds,
    defaultOnTimeout: partial.defaultOnTimeout ?? DEFAULT_APPROVAL_GATE.defaultOnTimeout,
    autoAllowTools: partial.autoAllowTools ?? DEFAULT_APPROVAL_GATE.autoAllowTools,
    requireApprovalTools: partial.requireApprovalTools ?? DEFAULT_APPROVAL_GATE.requireApprovalTools,
    dangerousPatterns: {
      commands: partial.dangerousPatterns?.commands ?? DEFAULT_APPROVAL_GATE.dangerousPatterns.commands,
      files: partial.dangerousPatterns?.files ?? DEFAULT_APPROVAL_GATE.dangerousPatterns.files,
    },
  };
}
