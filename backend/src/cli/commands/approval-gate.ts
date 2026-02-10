/**
 * Approval Gate Commands
 * Enable/disable approval gate for global or project scope
 */

import { Command } from 'commander';
import { patch } from '../api-client.js';
import { formatJson } from '../formatters/index.js';
import type { GlobalOptions } from '../types.js';

interface ApprovalGateOptions extends GlobalOptions {
  global?: boolean;
  project?: string;
  timeout?: string;
  autoAllow?: string;
  requireApproval?: string;
}

/**
 * Enable approval gate
 */
async function enableApprovalGate(options: ApprovalGateOptions): Promise<void> {
  const isProject = !!options.project;
  const scope = isProject ? 'project' : 'global';

  const approvalGateConfig = {
    enabled: true,
    timeoutSeconds: parseInt(options.timeout ?? '120', 10),
    autoAllowTools: options.autoAllow
      ? options.autoAllow.split(',').map((s) => s.trim())
      : ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
    requireApprovalTools: options.requireApproval
      ? options.requireApproval.split(',').map((s) => s.trim())
      : ['Write', 'Edit', 'Bash', 'WebFetch'],
  };

  let data;
  if (isProject) {
    // Project-level approval gate
    data = await patch<{ approvalGate: { enabled: boolean } }>(
      options.apiUrl,
      `/api/projects/${options.project}`,
      { approvalGate: approvalGateConfig }
    );
  } else {
    // Global approval gate via settings
    data = await patch<{ approvalGate: { enabled: boolean; timeoutSeconds: number } }>(
      options.apiUrl,
      '/api/settings',
      { approvalGate: approvalGateConfig }
    );
  }

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log(`✅ Approval gate enabled (${scope})`);
  console.log(`   Timeout:  ${approvalGateConfig.timeoutSeconds}s`);
  console.log(`   Auto-allow: ${approvalGateConfig.autoAllowTools.join(', ')}`);
  console.log(`   Require approval: ${approvalGateConfig.requireApprovalTools.join(', ')}`);
}

/**
 * Disable approval gate
 */
async function disableApprovalGate(options: ApprovalGateOptions): Promise<void> {
  const isProject = !!options.project;
  const scope = isProject ? 'project' : 'global';

  let data;
  if (isProject) {
    // Project-level approval gate
    data = await patch<{ approvalGate: null | { enabled: boolean } }>(
      options.apiUrl,
      `/api/projects/${options.project}`,
      { approvalGate: { enabled: false } }
    );
  } else {
    // Global approval gate via settings
    data = await patch<{ approvalGate: null | { enabled: boolean } }>(
      options.apiUrl,
      '/api/settings',
      { approvalGate: { enabled: false } }
    );
  }

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log(`✅ Approval gate disabled (${scope})`);
}

/**
 * Register approval-gate commands
 */
export function registerApprovalGateCommands(program: Command, getApiUrl: () => string): void {
  const approvalGate = program
    .command('approval-gate')
    .description('Enable/disable approval gate for tool approval workflow');

  approvalGate
    .command('enable')
    .description('Enable approval gate (provisions hook)')
    .option('--global', 'Apply globally (default)')
    .option('--project <id>', 'Apply to specific project')
    .option('--timeout <seconds>', 'Approval timeout in seconds', '120')
    .option('--auto-allow <tools>', 'Comma-separated tools to auto-allow')
    .option('--require-approval <tools>', 'Comma-separated tools requiring approval')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await enableApprovalGate({ ...opts, apiUrl: getApiUrl() });
    });

  approvalGate
    .command('disable')
    .description('Disable approval gate (unprovisions hook)')
    .option('--global', 'Apply globally (default)')
    .option('--project <id>', 'Apply to specific project')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await disableApprovalGate({ ...opts, apiUrl: getApiUrl() });
    });
}
