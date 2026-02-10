/**
 * Hook Commands
 * CLI commands for CLI provider hook management
 */

import { Command } from 'commander';
import { get, post, patch } from '../api-client.js';
import { formatTable, formatJson } from '../formatters/index.js';
import type { HookListResponse, GlobalOptions } from '../types.js';

interface HookListOptions extends GlobalOptions {
  projectId?: string;
  scope?: string;
}

interface HookProvisionOptions extends GlobalOptions {
  scope?: string;
  projectId?: string;
  timeout?: string;
  autoAllow?: string;
  requireApproval?: string;
}

/**
 * List configured hooks
 */
async function listHooks(options: HookListOptions): Promise<void> {
  const params = new URLSearchParams();
  if (options.projectId) params.set('projectId', options.projectId);
  if (options.scope) params.set('scope', options.scope);

  const query = params.toString();
  const path = `/api/cli-hooks${query ? '?' + query : ''}`;

  const data = await get<HookListResponse>(options.apiUrl, path);

  if (options.json) {
    formatJson(data.hooks);
    return;
  }

  if (!data.hooks || data.hooks.length === 0) {
    console.log('No hooks configured');
    return;
  }

  const rows = data.hooks.map((h) => ({
    name: h.name,
    type: h.hookType,
    scope: h.scope,
    enabled: h.enabled ? '✓' : '✗',
    synced: h.syncedAt ? '✓' : '✗',
  }));

  formatTable(rows, [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Hook Type' },
    { key: 'scope', header: 'Scope' },
    { key: 'enabled', header: 'Enabled' },
    { key: 'synced', header: 'Synced' },
  ]);
  console.log(`\n${data.hooks.length} hook(s) found`);
}

/**
 * Provision approval gate hook via Settings API
 * Enabling approvalGate in settings auto-provisions the hook
 */
async function provisionHook(options: HookProvisionOptions): Promise<void> {
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

  // Use Settings API - enabling approvalGate auto-provisions the hook
  const data = await patch<{ approvalGate: { enabled: boolean; timeoutSeconds: number } }>(
    options.apiUrl,
    '/api/settings',
    { approvalGate: approvalGateConfig }
  );

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log('✅ Approval gate hook provisioned');
  console.log(`   Timeout:  ${data.approvalGate?.timeoutSeconds ?? approvalGateConfig.timeoutSeconds}s`);
  console.log(`   Auto-allow: ${approvalGateConfig.autoAllowTools.join(', ')}`);
  console.log(`   Require approval: ${approvalGateConfig.requireApprovalTools.join(', ')}`);
}

/**
 * Unprovision approval gate hook via Settings API
 * Disabling approvalGate in settings auto-unprovisions the hook
 */
async function unprovisionHook(options: GlobalOptions & { scope?: string; projectId?: string }): Promise<void> {
  // Use Settings API - disabling approvalGate auto-unprovisions the hook
  const data = await patch<{ approvalGate: null | { enabled: boolean } }>(
    options.apiUrl,
    '/api/settings',
    { approvalGate: { enabled: false } }
  );

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log('✅ Approval gate hook disabled');
}

/**
 * Sync hooks to filesystem
 */
async function syncHooks(options: GlobalOptions & { projectId?: string }): Promise<void> {
  const body: Record<string, unknown> = {};
  if (options.projectId) body.projectId = options.projectId;

  const data = await post<{ success: boolean; synced: number }>(
    options.apiUrl,
    '/api/cli-hooks/sync-all',
    body
  );

  if (options.json) {
    formatJson(data);
    return;
  }

  console.log('✅ Hooks synced to filesystem');
  console.log(`   Synced: ${data.synced ?? 0} hook(s)`);
}

/**
 * Register hook commands
 */
export function registerHookCommands(program: Command, getApiUrl: () => string): void {
  const hook = program.command('hook').description('CLI provider hook management');

  hook
    .command('list')
    .description('List configured hooks')
    .option('--project-id <id>', 'Filter by project ID')
    .option('--scope <scope>', 'Filter by scope (global, project)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await listHooks({ ...opts, apiUrl: getApiUrl() });
    });

  hook
    .command('provision')
    .description('Provision approval gate hook for Claude CLI')
    .option('--scope <scope>', 'Hook scope (global, project)', 'global')
    .option('--project-id <id>', 'Project ID (required for project scope)')
    .option('--timeout <seconds>', 'Approval timeout in seconds', '120')
    .option('--auto-allow <tools>', 'Comma-separated tools to auto-allow')
    .option('--require-approval <tools>', 'Comma-separated tools requiring approval')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await provisionHook({ ...opts, apiUrl: getApiUrl() });
    });

  hook
    .command('unprovision')
    .description('Remove approval gate hook')
    .option('--scope <scope>', 'Hook scope (global, project)', 'global')
    .option('--project-id <id>', 'Project ID (required for project scope)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await unprovisionHook({ ...opts, apiUrl: getApiUrl() });
    });

  hook
    .command('sync')
    .description('Sync all hooks to filesystem')
    .option('--project-id <id>', 'Project ID (syncs project hooks only)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await syncHooks({ ...opts, apiUrl: getApiUrl() });
    });
}
