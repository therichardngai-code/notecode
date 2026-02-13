/**
 * Task Commands
 * Registers task command group and subcommands
 */

import { Command } from 'commander';
import { getTask, listTasks } from './task-list.js';
import { createTask, updateTask } from './task-mutations.js';

/**
 * Register task commands
 */
export function registerTaskCommands(program: Command, getApiUrl: () => string): void {
  const task = program.command('task').description('Task management');

  task
    .command('list')
    .description('List tasks')
    .option('--status <status>', 'Filter by status')
    .option('--assignee <id>', 'Filter by assignee agent ID')
    .option('--project-id <id>', 'Filter by project ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await listTasks({ ...opts, apiUrl: getApiUrl() });
    });

  task
    .command('get <task-id>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action(async (taskId, opts) => {
      await getTask(taskId, { ...opts, apiUrl: getApiUrl() });
    });

  task
    .command('create <title>')
    .description('Create a new task')
    .option('-p, --priority <priority>', 'Priority (high, medium, low)')
    .option('-d, --description <desc>', 'Task description')
    .option('--project-id <id>', 'Project ID')
    .option('--permission-mode <mode>', 'Permission mode (default, acceptEdits, bypassPermissions)')
    .option('--allow-tools <tools>', 'Comma-separated list of allowed tools (allowlist mode)')
    .option('--block-tools <tools>', 'Comma-separated list of blocked tools (blocklist mode)')
    .option('--provider <provider>', 'AI provider (anthropic, google, openai)')
    .option('--model <model>', 'AI model name')
    .option('--skills <skills>', 'Comma-separated list of skills')
    .option('--context-files <files>', 'Comma-separated list of context file paths')
    .option('--json', 'Output as JSON')
    .action(async (title, opts) => {
      await createTask(title, { ...opts, apiUrl: getApiUrl() });
    });

  task
    .command('update <task-id>')
    .description('Update a task')
    .option('--status <status>', 'New status')
    .option('--priority <priority>', 'New priority')
    .option('--title <title>', 'New title')
    .option('--description <desc>', 'New description')
    .option('--json', 'Output as JSON')
    .action(async (taskId, opts) => {
      await updateTask(taskId, { ...opts, apiUrl: getApiUrl() });
    });
}
