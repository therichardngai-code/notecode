/**
 * NoteCode CLI - Status Command
 * Show overall system status summary
 */

import { Command } from 'commander';
import { printError } from '../formatters.js';

const API_BASE = process.env.NOTECODE_API_URL || 'http://localhost:41920';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

/**
 * Fetch with error handling
 */
async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Get task counts by status
 */
async function getTaskCounts() {
  const result = await safeFetch(`${API_BASE}/api/tasks`);
  if (!result || !result.tasks) return null;
  
  const counts = {
    'not-started': 0,
    'in-progress': 0,
    'review': 0,
    'done': 0,
    'cancelled': 0,
    'archived': 0,
  };
  
  for (const task of result.tasks) {
    if (counts.hasOwnProperty(task.status)) {
      counts[task.status]++;
    }
  }
  
  return counts;
}

/**
 * Get session counts
 */
async function getSessionCounts() {
  const running = await safeFetch(`${API_BASE}/api/sessions/running`);
  const all = await safeFetch(`${API_BASE}/api/sessions?limit=100`);
  
  const runningCount = running?.sessions?.length || 0;
  const pausedCount = all?.sessions?.filter(s => s.status === 'paused').length || 0;
  
  return { running: runningCount, paused: pausedCount };
}

/**
 * Get pending approval count
 */
async function getPendingApprovals() {
  const result = await safeFetch(`${API_BASE}/api/approvals/pending`);
  return result?.approvals?.length || 0;
}

/**
 * Check server health
 */
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, ...data };
    }
    return { ok: false, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Get version info
 */
async function getVersion() {
  return await safeFetch(`${API_BASE}/api/version`);
}

/**
 * Format status output
 */
function formatStatus(health, version, tasks, sessions, approvals) {
  const lines = [];
  
  // Header
  lines.push(`${colors.bold}NoteCode Status${colors.reset}`);
  lines.push('═'.repeat(50));
  lines.push('');
  
  // Server status
  if (health.ok) {
    lines.push(`${colors.green}●${colors.reset} Server: ${colors.green}Running${colors.reset} on ${API_BASE}`);
  } else {
    lines.push(`${colors.red}●${colors.reset} Server: ${colors.red}Not reachable${colors.reset}`);
    if (health.error) {
      lines.push(`  ${colors.dim}${health.error}${colors.reset}`);
    }
  }
  
  // Version
  if (version) {
    lines.push(`  Version: ${version.version || 'unknown'}`);
  }
  
  lines.push('');
  
  // Tasks
  if (tasks) {
    lines.push(`${colors.cyan}Tasks:${colors.reset}`);
    
    if (tasks['not-started'] > 0) {
      lines.push(`  ${colors.gray}●${colors.reset} Not Started: ${tasks['not-started']}`);
    }
    if (tasks['in-progress'] > 0) {
      lines.push(`  ${colors.blue}●${colors.reset} In Progress: ${tasks['in-progress']}`);
    }
    if (tasks['review'] > 0) {
      lines.push(`  ${colors.yellow}●${colors.reset} Review:      ${tasks['review']}`);
    }
    if (tasks['done'] > 0) {
      lines.push(`  ${colors.green}●${colors.reset} Done:        ${tasks['done']}`);
    }
    if (tasks['cancelled'] > 0) {
      lines.push(`  ${colors.red}●${colors.reset} Cancelled:   ${tasks['cancelled']}`);
    }
    
    const total = Object.values(tasks).reduce((a, b) => a + b, 0);
    if (total === 0) {
      lines.push(`  ${colors.dim}No tasks${colors.reset}`);
    }
    
    lines.push('');
  }
  
  // Sessions
  lines.push(`${colors.cyan}Sessions:${colors.reset}`);
  if (sessions.running > 0) {
    lines.push(`  ${colors.blue}●${colors.reset} Running: ${sessions.running}`);
  }
  if (sessions.paused > 0) {
    lines.push(`  ${colors.yellow}●${colors.reset} Paused:  ${sessions.paused}`);
  }
  if (sessions.running === 0 && sessions.paused === 0) {
    lines.push(`  ${colors.dim}No active sessions${colors.reset}`);
  }
  
  lines.push('');
  
  // Approvals
  if (approvals > 0) {
    lines.push(`${colors.yellow}⚠ Pending Approvals: ${approvals}${colors.reset}`);
    lines.push(`  ${colors.dim}Run: notecode approval list${colors.reset}`);
  } else {
    lines.push(`${colors.cyan}Approvals:${colors.reset} ${colors.dim}None pending${colors.reset}`);
  }
  
  return lines.join('\n');
}

export function createStatusCommand() {
  const status = new Command('status')
    .description('Show overall system status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        // Gather all status info in parallel
        const [health, version, tasks, sessions, approvals] = await Promise.all([
          checkHealth(),
          getVersion(),
          getTaskCounts(),
          getSessionCounts(),
          getPendingApprovals(),
        ]);
        
        if (opts.json) {
          console.log(JSON.stringify({
            server: {
              status: health.ok ? 'running' : 'unreachable',
              url: API_BASE,
              version: version?.version,
            },
            tasks,
            sessions,
            pendingApprovals: approvals,
          }, null, 2));
          return;
        }
        
        console.log(formatStatus(health, version, tasks, sessions, approvals));
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  return status;
}
