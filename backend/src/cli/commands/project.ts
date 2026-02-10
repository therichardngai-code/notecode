/**
 * Project Commands
 * CLI commands for project management
 */

import { Command } from 'commander';
import { get, post, patch, del } from '../api-client.js';
import { formatTable, formatJson, printDetail } from '../formatters/index.js';
import { formatDate } from '../formatters/date.js';
import type { Project, ProjectListResponse, GlobalOptions } from '../types.js';

interface ProjectCreateOptions extends GlobalOptions {
  path?: string;
}

/**
 * List all projects
 */
async function listProjects(options: GlobalOptions): Promise<void> {
  const data = await get<ProjectListResponse>(options.apiUrl, '/api/projects');

  if (options.json) {
    formatJson(data.projects);
    return;
  }

  if (!data.projects || data.projects.length === 0) {
    console.log('No projects found');
    return;
  }

  const rows = data.projects.map((p) => ({
    id: p.id.slice(0, 8),
    name: p.name,
    path: p.path?.slice(-40) ?? '-',
    active: p.isActive ? '✓' : '✗',
    created: formatDate(p.createdAt),
  }));

  formatTable(rows, [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'path', header: 'Path' },
    { key: 'active', header: 'Active' },
    { key: 'created', header: 'Created' },
  ]);
  console.log(`\n${data.projects.length} project(s) found`);
}

/**
 * Get project details
 */
async function getProject(projectId: string, options: GlobalOptions): Promise<void> {
  const data = await get<{ project: Project }>(options.apiUrl, `/api/projects/${projectId}`);

  if (options.json) {
    formatJson(data.project);
    return;
  }

  const p = data.project;
  console.log(`Project: ${p.name}`);
  console.log('─'.repeat(50));
  printDetail('ID', p.id);
  printDetail('Name', p.name);
  printDetail('Path', p.path);
  printDetail('Active', p.isActive ? 'Yes' : 'No');
  printDetail('Created', formatDate(p.createdAt));
  printDetail('Updated', formatDate(p.updatedAt));
}

/**
 * Create a new project
 */
async function createProject(name: string, options: ProjectCreateOptions): Promise<void> {
  const body: Record<string, unknown> = { name };
  if (options.path) body.path = options.path;

  const data = await post<{ project: Project }>(options.apiUrl, '/api/projects', body);

  if (options.json) {
    formatJson(data.project);
    return;
  }

  console.log(`✅ Project created: ${data.project.id}`);
  console.log(`   Name: ${data.project.name}`);
  if (data.project.path) {
    console.log(`   Path: ${data.project.path}`);
  }
}

/**
 * Update a project
 */
async function updateProject(
  projectId: string,
  options: GlobalOptions & { name?: string; path?: string; active?: boolean }
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (options.name) body.name = options.name;
  if (options.path) body.path = options.path;
  if (options.active !== undefined) body.isActive = options.active;

  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided.');
    process.exit(1);
  }

  const data = await patch<{ project: Project }>(options.apiUrl, `/api/projects/${projectId}`, body);

  if (options.json) {
    formatJson(data.project);
    return;
  }

  console.log(`✅ Project updated: ${data.project.id}`);
}

/**
 * Delete a project
 */
async function deleteProject(projectId: string, options: GlobalOptions): Promise<void> {
  await del<{ success: boolean }>(options.apiUrl, `/api/projects/${projectId}`);

  if (options.json) {
    formatJson({ success: true, projectId });
    return;
  }

  console.log(`✅ Project deleted: ${projectId}`);
}

/**
 * Register project commands
 */
export function registerProjectCommands(program: Command, getApiUrl: () => string): void {
  const project = program.command('project').description('Project management');

  project
    .command('list')
    .description('List all projects')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      await listProjects({ ...opts, apiUrl: getApiUrl() });
    });

  project
    .command('get <project-id>')
    .description('Get project details')
    .option('--json', 'Output as JSON')
    .action(async (projectId, opts) => {
      await getProject(projectId, { ...opts, apiUrl: getApiUrl() });
    });

  project
    .command('create <name>')
    .description('Create a new project')
    .option('-p, --path <path>', 'Project directory path')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      await createProject(name, { ...opts, apiUrl: getApiUrl() });
    });

  project
    .command('update <project-id>')
    .description('Update a project')
    .option('--name <name>', 'New project name')
    .option('--path <path>', 'New project path')
    .option('--active', 'Set project as active')
    .option('--no-active', 'Set project as inactive')
    .option('--json', 'Output as JSON')
    .action(async (projectId, opts) => {
      await updateProject(projectId, { ...opts, apiUrl: getApiUrl() });
    });

  project
    .command('delete <project-id>')
    .description('Delete a project')
    .option('--json', 'Output as JSON')
    .action(async (projectId, opts) => {
      await deleteProject(projectId, { ...opts, apiUrl: getApiUrl() });
    });
}
