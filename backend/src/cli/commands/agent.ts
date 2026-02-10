/**
 * Agent Commands
 * CLI commands for agent management
 */

import { Command } from 'commander';
import { get } from '../api-client.js';
import { formatTable, formatJson } from '../formatters/index.js';
import type { Agent, GlobalOptions } from '../types.js';

interface AgentListResponse {
  agents: Agent[];
}

/**
 * List available agents
 */
async function listAgents(options: GlobalOptions): Promise<void> {
  const data = await get<AgentListResponse>(options.apiUrl, '/api/agents');

  if (options.json) {
    formatJson(data.agents);
    return;
  }

  if (!data.agents || data.agents.length === 0) {
    console.log('No agents found');
    return;
  }

  const rows = data.agents.map((a) => ({
    id: a.id,
    name: a.name,
    provider: a.provider,
    model: a.model,
    skills: Array.isArray(a.skills) ? a.skills.slice(0, 3).join(', ') : '-',
  }));

  formatTable(rows, [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'provider', header: 'Provider' },
    { key: 'model', header: 'Model' },
    { key: 'skills', header: 'Skills' },
  ]);
  console.log(`\n${data.agents.length} agent(s) found`);
}

/**
 * Get agent details
 */
async function getAgent(agentId: string, options: GlobalOptions): Promise<void> {
  const data = await get<{ agent: Agent }>(options.apiUrl, `/api/agents/${agentId}`);

  if (options.json) {
    formatJson(data.agent);
    return;
  }

  const a = data.agent;
  console.log(`Agent: ${a.name || a.id}`);
  console.log('─'.repeat(40));
  console.log(`ID:       ${a.id}`);
  console.log(`Provider: ${a.provider}`);
  console.log(`Model:    ${a.model}`);
  if (a.skills?.length) {
    console.log(`Skills:   ${a.skills.join(', ')}`);
  }
}

/**
 * Register agent commands
 */
export function registerAgentCommands(program: Command, getApiUrl: () => string): void {
  const agent = program.command('agent').description('Agent management');

  agent
    .command('list')
    .description('List available agents')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await listAgents({ ...opts, apiUrl: getApiUrl() });
    });

  agent
    .command('get <agent-id>')
    .description('Get agent details')
    .option('--json', 'Output as JSON')
    .action(async (agentId, opts) => {
      await getAgent(agentId, { ...opts, apiUrl: getApiUrl() });
    });
}
