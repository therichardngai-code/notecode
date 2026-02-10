/**
 * Status Command
 * Server status overview
 */

import { Command } from 'commander';
import { get } from '../api-client.js';
import { formatJson } from '../formatters/index.js';
import type { Session, Task, Approval, SessionListResponse, TaskListResponse, ApprovalListResponse, GlobalOptions } from '../types.js';

interface PlatformInfo {
  platform: string;
  arch: string;
  supported: boolean;
  method: string;
  isElectron: boolean;
}

/**
 * Count items by status
 */
function countByStatus<T extends { status: string }>(items: T[]): Record<string, number> {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Show server status overview
 */
async function showStatus(options: GlobalOptions): Promise<void> {
  // Fetch multiple endpoints in parallel
  const [platformData, sessionsData, tasksData, approvalsData] = await Promise.all([
    get<PlatformInfo>(options.apiUrl, '/api/system/platform').catch(() => null),
    get<SessionListResponse>(options.apiUrl, '/api/sessions?limit=100').catch(() => ({ sessions: [] })),
    get<TaskListResponse>(options.apiUrl, '/api/tasks').catch(() => ({ tasks: [] })),
    get<ApprovalListResponse>(options.apiUrl, '/api/approvals/pending').catch(() => ({ approvals: [] })),
  ]);

  const sessions = sessionsData.sessions || [];
  const tasks = tasksData.tasks || [];
  const approvals = approvalsData.approvals || [];

  const sessionsByStatus = countByStatus(sessions);
  const tasksByStatus = countByStatus(tasks);

  if (options.json) {
    formatJson({
      server: { url: options.apiUrl, platform: platformData },
      sessions: { total: sessions.length, byStatus: sessionsByStatus },
      tasks: { total: tasks.length, byStatus: tasksByStatus },
      pendingApprovals: approvals.length,
    });
    return;
  }

  console.log('NoteCode Server Status');
  console.log('─'.repeat(40));
  console.log(`Server:      ${options.apiUrl}`);
  if (platformData) {
    console.log(`Platform:    ${platformData.platform} (${platformData.arch})`);
  }
  console.log('');

  console.log('Sessions');
  console.log('─'.repeat(40));
  console.log(`Total:       ${sessions.length}`);
  if (sessionsByStatus.running) console.log(`  Running:   ${sessionsByStatus.running}`);
  if (sessionsByStatus.completed) console.log(`  Completed: ${sessionsByStatus.completed}`);
  if (sessionsByStatus.failed) console.log(`  Failed:    ${sessionsByStatus.failed}`);
  console.log('');

  console.log('Tasks');
  console.log('─'.repeat(40));
  console.log(`Total:       ${tasks.length}`);
  if (tasksByStatus['not-started']) console.log(`  Not Started: ${tasksByStatus['not-started']}`);
  if (tasksByStatus['in-progress']) console.log(`  In Progress: ${tasksByStatus['in-progress']}`);
  if (tasksByStatus.review) console.log(`  Review:      ${tasksByStatus.review}`);
  if (tasksByStatus.done) console.log(`  Done:        ${tasksByStatus.done}`);
  console.log('');

  console.log('Approvals');
  console.log('─'.repeat(40));
  console.log(`Pending:     ${approvals.length}`);
  if (approvals.length > 0) {
    console.log('');
    for (const a of approvals.slice(0, 3)) {
      console.log(`  ⚠️  ${a.id.slice(0, 8)} - ${a.payload?.toolName ?? 'unknown'}`);
    }
    if (approvals.length > 3) {
      console.log(`  ... and ${approvals.length - 3} more`);
    }
  }
}

/**
 * Register status command
 */
export function registerStatusCommand(program: Command, getApiUrl: () => string): void {
  program
    .command('status')
    .description('Show server status overview')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await showStatus({ ...opts, apiUrl: getApiUrl() });
    });
}
