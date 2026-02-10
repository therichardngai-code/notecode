/**
 * Approval Commands
 * CLI commands for approval management
 */

import { Command } from 'commander';
import { get, post } from '../api-client.js';
import { formatTable, formatJson, printDetail } from '../formatters/index.js';
import { formatDate } from '../formatters/date.js';
import type { Approval, ApprovalListResponse, GlobalOptions } from '../types.js';

/**
 * List pending approvals
 */
async function listApprovals(options: GlobalOptions): Promise<void> {
  const data = await get<ApprovalListResponse>(options.apiUrl, '/api/approvals/pending');

  if (options.json) {
    formatJson(data.approvals);
    return;
  }

  if (data.approvals.length === 0) {
    console.log('No pending approvals');
    return;
  }

  const rows = data.approvals.map((a) => ({
    id: a.id.slice(0, 8),
    type: a.type ?? '-',
    tool: a.payload?.toolName ?? '-',
    category: a.toolCategory ?? '-',
    session: a.sessionId?.slice(0, 8) ?? '-',
    timeout: formatDate(a.timeoutAt),
  }));

  formatTable(rows, [
    { key: 'id', header: 'ID' },
    { key: 'type', header: 'Type' },
    { key: 'tool', header: 'Tool' },
    { key: 'category', header: 'Category' },
    { key: 'session', header: 'Session' },
    { key: 'timeout', header: 'Timeout' },
  ]);
  console.log(`\n${data.approvals.length} pending approval(s)`);
}

/**
 * Get approval details
 */
async function getApproval(approvalId: string, options: GlobalOptions): Promise<void> {
  const data = await get<{ approval: Approval; diffs?: Array<{ filePath: string; operation: string }> }>(
    options.apiUrl,
    `/api/approvals/${approvalId}`
  );

  if (options.json) {
    formatJson(data);
    return;
  }

  const a = data.approval;
  console.log(`Approval: ${a.id}`);
  console.log('─'.repeat(60));
  printDetail('Status', a.status);
  printDetail('Type', a.type ?? '(none)');
  printDetail('Category', a.toolCategory ?? '(none)');
  printDetail('Session ID', a.sessionId ?? '(none)');
  printDetail('Created', formatDate(a.createdAt));
  if (a.timeoutAt) printDetail('Timeout At', formatDate(a.timeoutAt));

  if (a.payload) {
    console.log('\nPayload:');
    printDetail('  Tool', a.payload.toolName ?? '(none)');
    if (a.payload.toolInput) {
      const inputStr = JSON.stringify(a.payload.toolInput).slice(0, 100);
      printDetail('  Input', inputStr + (inputStr.length >= 100 ? '...' : ''));
    }
  }

  if (data.diffs && data.diffs.length > 0) {
    console.log(`\nRelated Diffs: ${data.diffs.length}`);
    for (const diff of data.diffs) {
      console.log(`  - ${diff.filePath} (${diff.operation})`);
    }
  }
}

/**
 * Approve a pending approval
 */
async function approveApproval(approvalId: string, options: GlobalOptions): Promise<void> {
  const data = await post<{ success: boolean }>(
    options.apiUrl,
    `/api/approvals/${approvalId}/approve`,
    {}
  );

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log(`✅ Approval ${approvalId.slice(0, 8)} approved`);
}

/**
 * Reject a pending approval
 */
async function rejectApproval(
  approvalId: string,
  options: GlobalOptions & { reason?: string }
): Promise<void> {
  const data = await post<{ success: boolean }>(
    options.apiUrl,
    `/api/approvals/${approvalId}/reject`,
    { reason: options.reason || 'Rejected via CLI' }
  );

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log(`❌ Approval ${approvalId.slice(0, 8)} rejected`);
}

/**
 * Register approval commands
 */
export function registerApprovalCommands(program: Command, getApiUrl: () => string): void {
  const approval = program.command('approval').description('Approval management');

  approval
    .command('list')
    .description('List pending approvals')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await listApprovals({ ...opts, apiUrl: getApiUrl() });
    });

  approval
    .command('get <approval-id>')
    .description('Get approval details')
    .option('--json', 'Output as JSON')
    .action(async (approvalId, opts) => {
      await getApproval(approvalId, { ...opts, apiUrl: getApiUrl() });
    });

  approval
    .command('approve <approval-id>')
    .description('Approve a pending approval')
    .option('--json', 'Output as JSON')
    .action(async (approvalId, opts) => {
      await approveApproval(approvalId, { ...opts, apiUrl: getApiUrl() });
    });

  approval
    .command('reject <approval-id>')
    .description('Reject a pending approval')
    .option('-r, --reason <reason>', 'Rejection reason')
    .option('--json', 'Output as JSON')
    .action(async (approvalId, opts) => {
      await rejectApproval(approvalId, { ...opts, apiUrl: getApiUrl() });
    });
}
