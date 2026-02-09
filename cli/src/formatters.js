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

/**
 * Format approval status with color
 */
function formatApprovalStatus(status) {
  const statusMap = {
    pending: colors.yellow + 'pending' + colors.reset,
    approved: colors.green + 'approved' + colors.reset,
    rejected: colors.red + 'rejected' + colors.reset,
    timeout: colors.gray + 'timeout' + colors.reset,
  };
  return statusMap[status] || status;
}

/**
 * Format approval category with color
 */
function formatCategory(category) {
  const categoryMap = {
    safe: colors.green + 'safe' + colors.reset,
    dangerous: colors.red + 'dangerous' + colors.reset,
    'requires-approval': colors.yellow + 'requires-approval' + colors.reset,
  };
  return categoryMap[category] || category;
}

/**
 * Format approval for list display
 */
export function formatApprovalRow(approval) {
  const id = colors.dim + approval.id.slice(0, 8) + colors.reset;
  const status = formatApprovalStatus(approval.status);
  const toolName = approval.payload?.toolName || '-';
  const category = formatCategory(approval.category);
  const sessionId = colors.dim + (approval.sessionId?.slice(0, 8) || '-') + colors.reset;
  const remaining = approval.remainingTimeMs
    ? `${Math.ceil(approval.remainingTimeMs / 1000)}s`
    : '-';
  
  return `${id}  ${status.padEnd(20)}  ${toolName.padEnd(15)}  ${category.padEnd(28)}  ${sessionId}  ${remaining}`;
}

/**
 * Format approval list header
 */
export function formatApprovalHeader() {
  return `${colors.bold}${'ID'.padEnd(10)}  ${'STATUS'.padEnd(12)}  ${'TOOL'.padEnd(15)}  ${'CATEGORY'.padEnd(20)}  ${'SESSION'.padEnd(10)}  ${'TIMEOUT'}${colors.reset}`;
}

/**
 * Format full approval details
 */
export function formatApprovalDetails(approval, diffs = []) {
  const lines = [
    `${colors.bold}Approval: ${approval.id}${colors.reset}`,
    '',
    `  ${colors.cyan}Status:${colors.reset}     ${formatApprovalStatus(approval.status)}`,
    `  ${colors.cyan}Category:${colors.reset}   ${formatCategory(approval.category)}`,
    `  ${colors.cyan}Session:${colors.reset}    ${approval.sessionId}`,
    `  ${colors.cyan}Type:${colors.reset}       ${approval.type}`,
  ];
  
  // Payload info
  if (approval.payload) {
    const { toolName, toolInput, matchedPattern } = approval.payload;
    lines.push('');
    lines.push(`  ${colors.cyan}Tool:${colors.reset}       ${toolName || '-'}`);
    
    if (matchedPattern) {
      lines.push(`  ${colors.cyan}Matched:${colors.reset}    ${colors.red}${matchedPattern}${colors.reset}`);
    }
    
    if (toolInput) {
      lines.push('');
      lines.push(`  ${colors.cyan}Tool Input:${colors.reset}`);
      const inputStr = JSON.stringify(toolInput, null, 2)
        .split('\n')
        .map(line => '    ' + line)
        .join('\n');
      lines.push(inputStr);
    }
  }
  
  lines.push('');
  lines.push(`  ${colors.cyan}Created:${colors.reset}    ${formatDate(approval.createdAt)}`);
  lines.push(`  ${colors.cyan}Timeout At:${colors.reset} ${formatDate(approval.timeoutAt)}`);
  
  if (approval.decidedAt) {
    lines.push(`  ${colors.cyan}Decided At:${colors.reset} ${formatDate(approval.decidedAt)}`);
    lines.push(`  ${colors.cyan}Decided By:${colors.reset} ${approval.decidedBy || '-'}`);
  }
  
  // Related diffs
  if (diffs && diffs.length > 0) {
    lines.push('');
    lines.push(`  ${colors.cyan}Related Diffs:${colors.reset}`);
    for (const diff of diffs) {
      lines.push(`    - ${diff.filePath} (${diff.type}): +${diff.linesAdded || 0}/-${diff.linesRemoved || 0}`);
    }
  }
  
  return lines.join('\n');
}
