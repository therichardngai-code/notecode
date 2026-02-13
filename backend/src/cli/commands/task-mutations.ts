/**
 * Task Mutation Commands
 * Create/update operations for task management
 */

import { post, patch } from '../api-client.js';
import { formatJson } from '../formatters/index.js';
import type { Task, GlobalOptions } from '../types.js';

export interface TaskCreateOptions extends GlobalOptions {
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

export interface TaskUpdateOptions extends GlobalOptions {
  status?: string;
  priority?: string;
  title?: string;
  description?: string;
}

/**
 * Create a new task
 */
export async function createTask(title: string, options: TaskCreateOptions): Promise<void> {
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
export async function updateTask(taskId: string, options: TaskUpdateOptions): Promise<void> {
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
