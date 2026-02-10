/**
 * Task Commands
 * CLI commands for task management
 */

import { Command } from 'commander';
import { get, post, patch } from '../api-client.js';
import { formatTable, formatJson, printDetail, truncate } from '../formatters/index.js';
import { formatDate } from '../formatters/date.js';
import type { Task, TaskListResponse, GlobalOptions } from '../types.js';

interface TaskListOptions extends GlobalOptions {
  status?: string;
  assignee?: string;
  projectId?: string;
}

interface TaskCreateOptions extends GlobalOptions {
  priority?: string;
  description?: string;
  projectId?: string;
  permissionMode?: string;
  allowTools?: string;
  blockTools?: string;
  provider?: string;
  model?: string;
  skills?: string;
  contextFiles?: string;
}

interface TaskUpdateOptions extends GlobalOptions {
  status?: string;
  priority?: string;
  title?: string;
  description?: string;
}

/**
 * List tasks with optional filters
 */
async function listTasks(options: TaskListOptions): Promise<void> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.assignee) params.set('agentId', options.assignee);
  if (options.projectId) params.set('projectId', options.projectId);

  const query = params.toString();
  const path = `/api/tasks${query ? '?' + query : ''}`;

  const data = await get<TaskListResponse>(options.apiUrl, path);

  if (options.json) {
    formatJson(data.tasks);
    return;
  }

  const rows = data.tasks.map((t) => ({
    id: t.id.slice(0, 8),
    status: t.status,
    priority: t.priority ?? '-',
    title: truncate(t.title, 50),
    created: formatDate(t.createdAt),
  }));

  formatTable(rows, [
    { key: 'id', header: 'ID' },
    { key: 'status', header: 'Status' },
    { key: 'priority', header: 'Priority' },
    { key: 'title', header: 'Title' },
    { key: 'created', header: 'Created' },
  ]);
  console.log(`\n${data.tasks.length} task(s) found`);
}

/**
 * Get task details
 */
async function getTask(taskId: string, options: GlobalOptions): Promise<void> {
  const data = await get<{ task: Task }>(options.apiUrl, `/api/tasks/${taskId}`);

  if (options.json) {
    formatJson(data.task);
    return;
  }

  const t = data.task;
  console.log(`Task: ${t.title}`);
  console.log('─'.repeat(60));
  printDetail('ID', t.id);
  printDetail('Status', t.status);
  printDetail('Priority', t.priority ?? 'none');
  printDetail('Description', t.description || '(none)');
  printDetail('Project ID', t.projectId);
  printDetail('Created', formatDate(t.createdAt));
  printDetail('Updated', formatDate(t.updatedAt));
}

/**
 * Create a new task
 */
async function createTask(title: string, options: TaskCreateOptions): Promise<void> {
  const body: Record<string, unknown> = {
    title,
    description: options.description ?? '',
    priority: options.priority ?? null,
  };
  if (options.projectId) body.projectId = options.projectId;
  if (options.permissionMode) body.permissionMode = options.permissionMode;
  if (options.provider) body.provider = options.provider;
  if (options.model) body.model = options.model;
  if (options.skills) body.skills = options.skills.split(',').map((s) => s.trim());
  if (options.contextFiles) body.contextFiles = options.contextFiles.split(',').map((s) => s.trim());

  // Handle tools (allowlist or blocklist)
  if (options.allowTools) {
    body.tools = {
      mode: 'allowlist',
      tools: options.allowTools.split(',').map((s) => s.trim()),
    };
  } else if (options.blockTools) {
    body.tools = {
      mode: 'blocklist',
      tools: options.blockTools.split(',').map((s) => s.trim()),
    };
  }

  const data = await post<{ task: Task }>(options.apiUrl, '/api/tasks', body);

  if (options.json) {
    formatJson(data.task);
    return;
  }

  console.log(`✅ Task created: ${data.task.id}`);
  console.log(`   Title: ${data.task.title}`);
  if (options.permissionMode) console.log(`   Permission Mode: ${options.permissionMode}`);
  if (options.allowTools) console.log(`   Allowed Tools: ${options.allowTools}`);
  if (options.blockTools) console.log(`   Blocked Tools: ${options.blockTools}`);
}

/**
 * Update a task
 */
async function updateTask(taskId: string, options: TaskUpdateOptions): Promise<void> {
  const body: Record<string, unknown> = {};
  if (options.status) body.status = options.status;
  if (options.priority) body.priority = options.priority;
  if (options.title) body.title = options.title;
  if (options.description) body.description = options.description;

  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided. Use --status, --priority, --title, or --description.');
    process.exit(1);
  }

  const data = await patch<{ task: Task; warnings?: Array<{ message: string }> }>(
    options.apiUrl,
    `/api/tasks/${taskId}`,
    body
  );

  if (options.json) {
    formatJson(data.task);
    return;
  }

  console.log(`✅ Task updated: ${data.task.id}`);
  console.log(`   Status: ${data.task.status}`);
  if (data.warnings?.length) {
    for (const w of data.warnings) {
      console.log(`   ⚠️  ${w.message}`);
    }
  }
}

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
