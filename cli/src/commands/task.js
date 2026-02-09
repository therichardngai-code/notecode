/**
 * NoteCode CLI - Task Commands
 */

import { Command } from 'commander';
import * as api from '../api.js';
import {
  formatTaskRow,
  formatTaskHeader,
  formatTaskDetails,
  printError,
  printSuccess,
} from '../formatters.js';

export function createTaskCommands() {
  const task = new Command('task')
    .description('Manage tasks');
  
  // task list
  task
    .command('list')
    .description('List all tasks')
    .option('--status <status>', 'Filter by status (comma-separated: not-started,in-progress,review,done,cancelled,archived)')
    .option('--priority <priority>', 'Filter by priority (comma-separated: high,medium,low)')
    .option('--project <id>', 'Filter by project ID')
    .option('--assignee <id>', 'Filter by agent/assignee ID')
    .option('--search <query>', 'Search in title/description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const { tasks } = await api.listTasks({
          status: opts.status,
          priority: opts.priority,
          projectId: opts.project,
          agentId: opts.assignee,
          search: opts.search,
        });
        
        if (opts.json) {
          console.log(JSON.stringify({ tasks }, null, 2));
          return;
        }
        
        if (tasks.length === 0) {
          console.log('No tasks found.');
          return;
        }
        
        console.log(formatTaskHeader());
        console.log('-'.repeat(100));
        tasks.forEach(t => console.log(formatTaskRow(t)));
        console.log(`\n${tasks.length} task(s) found.`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
  
  // task get <id>
  task
    .command('get <id>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const { task: taskData } = await api.getTask(id);
        
        if (opts.json) {
          console.log(JSON.stringify({ task: taskData }, null, 2));
          return;
        }
        
        console.log(formatTaskDetails(taskData));
      } catch (err) {
        if (err.status === 404) {
          printError(`Task not found: ${id}`);
        } else {
          printError(err.message);
        }
        process.exit(1);
      }
    });
  
  // task create
  task
    .command('create')
    .description('Create a new task')
    .requiredOption('--title <title>', 'Task title')
    .option('--description <desc>', 'Task description')
    .option('--priority <priority>', 'Priority (high, medium, low)')
    .option('--assignee <id>', 'Agent ID to assign')
    .option('--project <id>', 'Project ID (uses active project if not set)')
    .option('--provider <provider>', 'AI provider (anthropic, google, openai)')
    .option('--model <model>', 'Model name')
    .option('--skills <skills>', 'Comma-separated skill names')
    .option('--context-files <files>', 'Comma-separated context file paths')
    .option('--auto-branch', 'Enable auto-branch on start')
    .option('--auto-commit', 'Enable auto-commit on completion')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const data = {
          title: opts.title,
          description: opts.description || '',
          priority: opts.priority || null,
          agentId: opts.assignee,
          projectId: opts.project,
          provider: opts.provider,
          model: opts.model,
          skills: opts.skills ? opts.skills.split(',').map(s => s.trim()) : [],
          contextFiles: opts.contextFiles ? opts.contextFiles.split(',').map(f => f.trim()) : [],
          autoBranch: opts.autoBranch || false,
          autoCommit: opts.autoCommit || false,
        };
        
        const { task: taskData } = await api.createTask(data);
        
        if (opts.json) {
          console.log(JSON.stringify({ task: taskData }, null, 2));
          return;
        }
        
        printSuccess(`Task created: ${taskData.id}`);
        console.log(formatTaskDetails(taskData));
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
  
  // task update <id>
  task
    .command('update <id>')
    .description('Update a task')
    .option('--title <title>', 'New title')
    .option('--description <desc>', 'New description')
    .option('--status <status>', 'New status (not-started, in-progress, review, done, cancelled, archived)')
    .option('--priority <priority>', 'New priority (high, medium, low)')
    .option('--assignee <id>', 'Agent ID to assign (use "none" to unassign)')
    .option('--provider <provider>', 'AI provider (anthropic, google, openai, or "none" to clear)')
    .option('--model <model>', 'Model name (or "none" to clear)')
    .option('--skills <skills>', 'Comma-separated skill names')
    .option('--context-files <files>', 'Comma-separated context file paths')
    .option('--auto-branch', 'Enable auto-branch')
    .option('--no-auto-branch', 'Disable auto-branch')
    .option('--auto-commit', 'Enable auto-commit')
    .option('--no-auto-commit', 'Disable auto-commit')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const data = {};
        
        if (opts.title) data.title = opts.title;
        if (opts.description !== undefined) data.description = opts.description;
        if (opts.status) data.status = opts.status;
        if (opts.priority) data.priority = opts.priority;
        if (opts.assignee) {
          data.agentId = opts.assignee === 'none' ? null : opts.assignee;
        }
        if (opts.provider) {
          data.provider = opts.provider === 'none' ? null : opts.provider;
        }
        if (opts.model) {
          data.model = opts.model === 'none' ? null : opts.model;
        }
        if (opts.skills) {
          data.skills = opts.skills.split(',').map(s => s.trim());
        }
        if (opts.contextFiles) {
          data.contextFiles = opts.contextFiles.split(',').map(f => f.trim());
        }
        if (opts.autoBranch !== undefined) {
          data.autoBranch = opts.autoBranch;
        }
        if (opts.autoCommit !== undefined) {
          data.autoCommit = opts.autoCommit;
        }
        
        if (Object.keys(data).length === 0) {
          printError('No update options provided. Use --help to see available options.');
          process.exit(1);
        }
        
        const { task: taskData, warnings } = await api.updateTask(id, data);
        
        if (opts.json) {
          console.log(JSON.stringify({ task: taskData, warnings }, null, 2));
          return;
        }
        
        printSuccess(`Task updated: ${taskData.id}`);
        
        if (warnings && warnings.length > 0) {
          console.log('\nWarnings:');
          warnings.forEach(w => console.log(`  ⚠️  ${w.message}`));
        }
        
        console.log('');
        console.log(formatTaskDetails(taskData));
      } catch (err) {
        if (err.status === 404) {
          printError(`Task not found: ${id}`);
        } else {
          printError(err.message);
        }
        process.exit(1);
      }
    });
  
  return task;
}
