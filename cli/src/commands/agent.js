/**
 * NoteCode CLI - Agent Commands
 * Agent discovery and management
 */

import { Command } from 'commander';
import {
  discoverAgents,
  discoverSkills,
  getSettings,
  getProject,
} from '../api.js';
import {
  formatAgentHeader,
  formatAgentRow,
  formatAgentDetails,
  formatSkillHeader,
  formatSkillRow,
  printError,
  printSuccess,
} from '../formatters.js';

/**
 * Create the agent command group
 */
export function createAgentCommands() {
  const agent = new Command('agent')
    .description('Agent discovery and management');

  // notecode agent list [--project <id>] [--provider <provider>]
  agent
    .command('list')
    .description('List available agents for a project')
    .option('-p, --project <id>', 'Project ID (uses active project if not specified)')
    .option('--provider <provider>', 'Provider (anthropic, google, openai)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        // Determine project ID
        let projectId = opts.project;
        if (!projectId) {
          const settings = await getSettings();
          projectId = settings.currentActiveProjectId;
          if (!projectId) {
            printError('No project specified and no active project set. Use --project <id> or set an active project.');
            process.exit(1);
          }
        }
        
        const result = await discoverAgents(projectId, opts.provider);
        const agents = result.agents || [];
        
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        
        if (agents.length === 0) {
          console.log(`No agents found for project (provider: ${result.provider})`);
          return;
        }
        
        console.log(`Agents for project (provider: ${result.provider}):`);
        console.log('');
        console.log(formatAgentHeader());
        console.log('-'.repeat(110));
        for (const ag of agents) {
          console.log(formatAgentRow(ag));
        }
        console.log('');
        console.log(`Total: ${agents.length} agent(s)`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // notecode agent get <name> [--project <id>]
  agent
    .command('get <name>')
    .description('Get details of a specific agent')
    .option('-p, --project <id>', 'Project ID (uses active project if not specified)')
    .option('--provider <provider>', 'Provider (anthropic, google, openai)')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      try {
        // Determine project ID
        let projectId = opts.project;
        if (!projectId) {
          const settings = await getSettings();
          projectId = settings.currentActiveProjectId;
          if (!projectId) {
            printError('No project specified and no active project set. Use --project <id> or set an active project.');
            process.exit(1);
          }
        }
        
        const result = await discoverAgents(projectId, opts.provider);
        const agents = result.agents || [];
        
        // Find agent by name (case-insensitive)
        const agent = agents.find(a => 
          a.name.toLowerCase() === name.toLowerCase()
        );
        
        if (!agent) {
          printError(`Agent "${name}" not found. Available agents: ${agents.map(a => a.name).join(', ') || 'none'}`);
          process.exit(1);
        }
        
        if (opts.json) {
          console.log(JSON.stringify({ agent, provider: result.provider }, null, 2));
          return;
        }
        
        console.log(formatAgentDetails(agent));
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // notecode agent skills [--project <id>]
  agent
    .command('skills')
    .description('List available skills for a project')
    .option('-p, --project <id>', 'Project ID (uses active project if not specified)')
    .option('--provider <provider>', 'Provider (anthropic, google, openai)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        // Determine project ID
        let projectId = opts.project;
        if (!projectId) {
          const settings = await getSettings();
          projectId = settings.currentActiveProjectId;
          if (!projectId) {
            printError('No project specified and no active project set. Use --project <id> or set an active project.');
            process.exit(1);
          }
        }
        
        const result = await discoverSkills(projectId, opts.provider);
        const skills = result.skills || [];
        
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        
        if (skills.length === 0) {
          console.log(`No skills found for project (provider: ${result.provider})`);
          return;
        }
        
        console.log(`Skills for project (provider: ${result.provider}):`);
        console.log('');
        console.log(formatSkillHeader());
        console.log('-'.repeat(110));
        for (const skill of skills) {
          console.log(formatSkillRow(skill));
        }
        console.log('');
        console.log(`Total: ${skills.length} skill(s)`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // notecode agent spawn --task <id> --prompt "<prompt>" [--skills]
  agent
    .command('spawn')
    .description('Spawn an agent to work on a task (experimental)')
    .requiredOption('-t, --task <id>', 'Task ID to work on')
    .requiredOption('--prompt <prompt>', 'Prompt for the agent')
    .option('-s, --skills <skills>', 'Comma-separated list of skills to use')
    .option('-a, --agent <name>', 'Agent name to use')
    .option('--provider <provider>', 'Provider (anthropic, google, openai)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        // This is a placeholder - the actual spawn functionality would need
        // to be implemented in the backend. For now, we'll show what would be done.
        const spawnConfig = {
          taskId: opts.task,
          prompt: opts.prompt,
          skills: opts.skills ? opts.skills.split(',').map(s => s.trim()) : [],
          agentName: opts.agent,
          provider: opts.provider,
        };
        
        if (opts.json) {
          console.log(JSON.stringify({
            message: 'Agent spawn not yet implemented in backend',
            config: spawnConfig,
          }, null, 2));
          return;
        }
        
        console.log('Agent Spawn Configuration:');
        console.log(`  Task ID:  ${spawnConfig.taskId}`);
        console.log(`  Prompt:   ${spawnConfig.prompt}`);
        if (spawnConfig.skills.length > 0) {
          console.log(`  Skills:   ${spawnConfig.skills.join(', ')}`);
        }
        if (spawnConfig.agentName) {
          console.log(`  Agent:    ${spawnConfig.agentName}`);
        }
        if (spawnConfig.provider) {
          console.log(`  Provider: ${spawnConfig.provider}`);
        }
        console.log('');
        console.log('Note: Agent spawn functionality is experimental.');
        console.log('Use "notecode task start <id>" to start a session on this task.');
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  return agent;
}
