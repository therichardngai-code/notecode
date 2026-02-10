/**
 * Session Commands
 * CLI commands for session management
 */

import { Command } from 'commander';
import { get } from '../api-client.js';
import { formatTable, formatJson, printDetail } from '../formatters/index.js';
import { formatDate, formatDuration } from '../formatters/date.js';
import type { Session, SessionListResponse, GlobalOptions } from '../types.js';

interface SessionListOptions extends GlobalOptions {
  task?: string;
  limit?: string;
}

/**
 * List sessions with optional filters
 */
async function listSessions(options: SessionListOptions): Promise<void> {
  const params = new URLSearchParams();
  if (options.task) params.set('taskId', options.task);
  if (options.limit) params.set('limit', options.limit);

  const query = params.toString();
  const path = `/api/sessions${query ? '?' + query : ''}`;

  const data = await get<SessionListResponse>(options.apiUrl, path);

  if (options.json) {
    formatJson(data.sessions);
    return;
  }

  const rows = data.sessions.map((s) => ({
    id: s.id.slice(0, 8),
    status: s.status,
    task: s.taskId?.slice(0, 8) ?? '-',
    provider: s.provider ?? '-',
    started: formatDate(s.startedAt),
    duration: formatDuration(s.durationMs),
  }));

  formatTable(rows, [
    { key: 'id', header: 'ID' },
    { key: 'status', header: 'Status' },
    { key: 'task', header: 'Task' },
    { key: 'provider', header: 'Provider' },
    { key: 'started', header: 'Started' },
    { key: 'duration', header: 'Duration' },
  ]);
  console.log(`\n${data.sessions.length} session(s) found`);
}

/**
 * Get session details
 */
async function getSession(sessionId: string, options: GlobalOptions): Promise<void> {
  const data = await get<{ session: Session }>(options.apiUrl, `/api/sessions/${sessionId}`);

  if (options.json) {
    formatJson(data.session);
    return;
  }

  const s = data.session;
  console.log(`Session: ${s.id}`);
  console.log('─'.repeat(60));
  printDetail('Status', s.status);
  printDetail('Task ID', s.taskId ?? '(none)');
  printDetail('Provider', s.provider ?? '(none)');
  printDetail('Working Dir', s.workingDir ?? '(none)');
  printDetail('Started', formatDate(s.startedAt));
  if (s.endedAt) printDetail('Ended', formatDate(s.endedAt));
  if (s.durationMs) printDetail('Duration', formatDuration(s.durationMs));
  if (s.tokenUsage) {
    printDetail('Tokens', `${s.tokenUsage.input ?? 0} in / ${s.tokenUsage.output ?? 0} out`);
    if (s.tokenUsage.estimatedCostUsd) {
      printDetail('Cost', `$${s.tokenUsage.estimatedCostUsd.toFixed(4)}`);
    }
  }
}

/**
 * Register session commands
 */
export function registerSessionCommands(program: Command, getApiUrl: () => string): void {
  const session = program.command('session').description('Session management');

  session
    .command('list')
    .description('List sessions')
    .option('--task <task-id>', 'Filter by task ID')
    .option('--limit <n>', 'Maximum number of sessions to return')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await listSessions({ ...opts, apiUrl: getApiUrl() });
    });

  session
    .command('get <session-id>')
    .description('Get session details')
    .option('--json', 'Output as JSON')
    .action(async (sessionId, opts) => {
      await getSession(sessionId, { ...opts, apiUrl: getApiUrl() });
    });
}
