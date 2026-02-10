/**
 * NoteCode CLI - Output Formatters
 * Formats data for human-readable output
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Status colors
const statusColors = {
  'not-started': colors.gray,
  'in-progress': colors.blue,
  'review': colors.yellow,
  'done': colors.green,
  'cancelled': colors.red,
  'archived': colors.dim,
  // Session statuses
  'queued': colors.gray,
  'running': colors.blue,
  'paused': colors.yellow,
  'completed': colors.green,
  'failed': colors.red,
  'cancelled': colors.red,
};

// Priority colors
const priorityColors = {
  high: colors.red,
  medium: colors.yellow,
  low: colors.gray,
};

/**
 * Format a status with color
 */
function formatStatus(status) {
  const color = statusColors[status] || colors.white;
  return `${color}${status}${colors.reset}`;
}

/**
 * Format priority with color
 */
function formatPriority(priority) {
  if (!priority) return colors.dim + 'none' + colors.reset;
  const color = priorityColors[priority] || colors.white;
  return `${color}${priority}${colors.reset}`;
}

/**
 * Format a date
 */
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLen = 50) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Format a task for list display
 */
export function formatTaskRow(task) {
  const id = colors.dim + task.id.slice(0, 8) + colors.reset;
  const status = formatStatus(task.status);
  const priority = formatPriority(task.priority);
  const title = truncate(task.title, 40);
  const updated = formatRelativeTime(task.updatedAt);
  
  return `${id}  ${status.padEnd(20)}  ${priority.padEnd(18)}  ${title.padEnd(42)}  ${updated}`;
}

/**
 * Format task list header
 */
export function formatTaskHeader() {
  return `${colors.bold}${'ID'.padEnd(10)}  ${'STATUS'.padEnd(12)}  ${'PRIORITY'.padEnd(10)}  ${'TITLE'.padEnd(42)}  ${'UPDATED'}${colors.reset}`;
}

/**
 * Format full task details
 */
export function formatTaskDetails(task) {
  const lines = [
    `${colors.bold}Task: ${task.title}${colors.reset}`,
    '',
    `  ${colors.cyan}ID:${colors.reset}          ${task.id}`,
    `  ${colors.cyan}Status:${colors.reset}      ${formatStatus(task.status)}`,
    `  ${colors.cyan}Priority:${colors.reset}    ${formatPriority(task.priority)}`,
    `  ${colors.cyan}Project ID:${colors.reset}  ${task.projectId}`,
  ];
  
  if (task.agentId) {
    lines.push(`  ${colors.cyan}Agent ID:${colors.reset}    ${task.agentId}`);
  }
  if (task.agentRole) {
    lines.push(`  ${colors.cyan}Agent Role:${colors.reset}  ${task.agentRole}`);
  }
  if (task.provider) {
    lines.push(`  ${colors.cyan}Provider:${colors.reset}    ${task.provider}`);
  }
  if (task.model) {
    lines.push(`  ${colors.cyan}Model:${colors.reset}       ${task.model}`);
  }
  
  lines.push('');
  lines.push(`  ${colors.cyan}Created:${colors.reset}     ${formatDate(task.createdAt)}`);
  lines.push(`  ${colors.cyan}Updated:${colors.reset}     ${formatDate(task.updatedAt)}`);
  
  if (task.startedAt) {
    lines.push(`  ${colors.cyan}Started:${colors.reset}     ${formatDate(task.startedAt)}`);
  }
  if (task.completedAt) {
    lines.push(`  ${colors.cyan}Completed:${colors.reset}   ${formatDate(task.completedAt)}`);
  }
  
  if (task.description) {
    lines.push('');
    lines.push(`  ${colors.cyan}Description:${colors.reset}`);
    lines.push(`  ${task.description.split('\n').join('\n  ')}`);
  }
  
  if (task.contextFiles && task.contextFiles.length > 0) {
    lines.push('');
    lines.push(`  ${colors.cyan}Context Files:${colors.reset}`);
    task.contextFiles.forEach(f => lines.push(`    - ${f}`));
  }
  
  if (task.skills && task.skills.length > 0) {
    lines.push('');
    lines.push(`  ${colors.cyan}Skills:${colors.reset} ${task.skills.join(', ')}`);
  }
  
  // Git info
  if (task.branchName) {
    lines.push('');
    lines.push(`  ${colors.cyan}Branch:${colors.reset}      ${task.branchName}`);
    if (task.baseBranch) {
      lines.push(`  ${colors.cyan}Base:${colors.reset}        ${task.baseBranch}`);
    }
  }
  
  // Attempt tracking
  if (task.attemptCount > 0) {
    lines.push('');
    lines.push(`  ${colors.cyan}Attempts:${colors.reset}    ${task.attemptCount} (success: ${task.successCount}, fail: ${task.failureCount})`);
    if (task.totalTokens) {
      lines.push(`  ${colors.cyan}Tokens:${colors.reset}      ${task.totalTokens.toLocaleString()}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format session for list display
 */
export function formatSessionRow(session) {
  const id = colors.dim + session.id.slice(0, 8) + colors.reset;
  const status = formatStatus(session.status);
  const taskId = colors.dim + (session.taskId?.slice(0, 8) || '-') + colors.reset;
  const name = truncate(session.name || '-', 35);
  const updated = formatRelativeTime(session.updatedAt);
  
  return `${id}  ${status.padEnd(20)}  ${taskId}  ${name.padEnd(37)}  ${updated}`;
}

/**
 * Format session list header
 */
export function formatSessionHeader() {
  return `${colors.bold}${'ID'.padEnd(10)}  ${'STATUS'.padEnd(12)}  ${'TASK ID'.padEnd(10)}  ${'NAME'.padEnd(37)}  ${'UPDATED'}${colors.reset}`;
}

/**
 * Format full session details
 */
export function formatSessionDetails(session) {
  const lines = [
    `${colors.bold}Session: ${session.name || session.id}${colors.reset}`,
    '',
    `  ${colors.cyan}ID:${colors.reset}           ${session.id}`,
    `  ${colors.cyan}Status:${colors.reset}       ${formatStatus(session.status)}`,
    `  ${colors.cyan}Task ID:${colors.reset}      ${session.taskId}`,
  ];
  
  if (session.agentId) {
    lines.push(`  ${colors.cyan}Agent ID:${colors.reset}     ${session.agentId}`);
  }
  if (session.provider) {
    lines.push(`  ${colors.cyan}Provider:${colors.reset}     ${session.provider}`);
  }
  if (session.workingDir) {
    lines.push(`  ${colors.cyan}Working Dir:${colors.reset}  ${session.workingDir}`);
  }
  
  lines.push('');
  lines.push(`  ${colors.cyan}Created:${colors.reset}      ${formatDate(session.createdAt)}`);
  lines.push(`  ${colors.cyan}Updated:${colors.reset}      ${formatDate(session.updatedAt)}`);
  
  if (session.startedAt) {
    lines.push(`  ${colors.cyan}Started:${colors.reset}      ${formatDate(session.startedAt)}`);
  }
  if (session.endedAt) {
    lines.push(`  ${colors.cyan}Ended:${colors.reset}        ${formatDate(session.endedAt)}`);
  }
  
  // Token/cost info
  if (session.inputTokens || session.outputTokens) {
    lines.push('');
    lines.push(`  ${colors.cyan}Input Tokens:${colors.reset}   ${(session.inputTokens || 0).toLocaleString()}`);
    lines.push(`  ${colors.cyan}Output Tokens:${colors.reset}  ${(session.outputTokens || 0).toLocaleString()}`);
    if (session.costUsd) {
      lines.push(`  ${colors.cyan}Cost:${colors.reset}           $${session.costUsd.toFixed(4)}`);
    }
  }
  
  if (session.providerSessionId) {
    lines.push('');
    lines.push(`  ${colors.cyan}Provider Session:${colors.reset} ${session.providerSessionId}`);
  }
  
  if (session.exitReason) {
    lines.push('');
    lines.push(`  ${colors.cyan}Exit Reason:${colors.reset}  ${session.exitReason}`);
  }
  
  return lines.join('\n');
}

/**
 * Print an error message
 */
export function printError(message) {
  console.error(`${colors.red}Error:${colors.reset} ${message}`);
}

/**
 * Print a success message
 */
export function printSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}
