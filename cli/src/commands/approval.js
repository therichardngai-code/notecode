/**
 * NoteCode CLI - Approval Commands
 * Manage approval requests for tool/diff operations
 */

import { Command } from 'commander';
import {
  listPendingApprovals,
  getApproval,
  approveApproval,
  rejectApproval,
  listApprovalsBySession,
} from '../api.js';
import {
  formatApprovalRow,
  formatApprovalHeader,
  formatApprovalDetails,
  printError,
  printSuccess,
} from '../formatters.js';

export function createApprovalCommands() {
  const approval = new Command('approval')
    .description('Manage approval requests');

  // approval list
  approval
    .command('list')
    .description('List pending approvals')
    .option('--session <id>', 'Filter by session ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        let approvals;
        if (opts.session) {
          const result = await listApprovalsBySession(opts.session);
          approvals = result.approvals;
        } else {
          const result = await listPendingApprovals();
          approvals = result.approvals;
        }

        if (opts.json) {
          console.log(JSON.stringify(approvals, null, 2));
          return;
        }

        if (approvals.length === 0) {
          console.log('No pending approvals');
          return;
        }

        console.log(formatApprovalHeader());
        console.log('-'.repeat(100));
        for (const approval of approvals) {
          console.log(formatApprovalRow(approval));
        }
        console.log(`\n${approvals.length} approval(s) pending`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // approval get <id>
  approval
    .command('get <id>')
    .description('Get approval details')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const result = await getApproval(id);

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(formatApprovalDetails(result.approval, result.diffs));
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // approval approve <id>
  approval
    .command('approve <id>')
    .description('Approve a pending request')
    .option('-m, --message <message>', 'Approval message/reason')
    .action(async (id, opts) => {
      try {
        await approveApproval(id, opts.message);
        printSuccess(`Approved: ${id}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // approval reject <id>
  approval
    .command('reject <id>')
    .description('Reject a pending request')
    .requiredOption('-r, --reason <reason>', 'Rejection reason (required)')
    .action(async (id, opts) => {
      try {
        await rejectApproval(id, opts.reason);
        printSuccess(`Rejected: ${id}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  return approval;
}
