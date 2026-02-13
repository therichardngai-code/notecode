/**
 * Task List Commands
 * List/get operations for task management
 */

import { get } from '../api-client.js';
import { formatTable, formatJson, printDetail, truncate } from '../formatters/index.js';
import { formatDate } from '../formatters/date.js';
import type { Task, TaskListResponse, GlobalOptions } from '../types.js';

export interface TaskListOptions extends GlobalOptions {
  status?: string;
  assignee?: string;
  projectId?: string;
}

/**
 * List tasks with optional filters
 */
export async function listTasks(options: TaskListOptions): Promise<void> {
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
export async function getTask(taskId: string, options: GlobalOptions): Promise<void> {
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
