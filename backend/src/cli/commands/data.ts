/**
 * Data Commands
 * CLI commands for import/export functionality
 */

import { Command } from 'commander';
import { writeFileSync, readFileSync } from 'fs';
import { get, post } from '../api-client.js';
import { formatJson } from '../formatters/index.js';
import type { GlobalOptions } from '../types.js';

interface ExportOptions extends GlobalOptions {
  output?: string;
  format?: string;
}

interface ImportOptions extends GlobalOptions {
  merge?: boolean;
}

interface ExportData {
  version: string;
  exportedAt: string;
  tasks: unknown[];
  sessions: unknown[];
  projects: unknown[];
  hooks: unknown[];
}

/**
 * Export data to file
 */
async function exportData(options: ExportOptions): Promise<void> {
  const [tasks, sessions, projects, hooks] = await Promise.all([
    get<{ tasks: unknown[] }>(options.apiUrl, '/api/tasks').catch(() => ({ tasks: [] })),
    get<{ sessions: unknown[] }>(options.apiUrl, '/api/sessions?limit=1000').catch(() => ({ sessions: [] })),
    get<{ projects: unknown[] }>(options.apiUrl, '/api/projects').catch(() => ({ projects: [] })),
    get<{ hooks: unknown[] }>(options.apiUrl, '/api/cli-hooks').catch(() => ({ hooks: [] })),
  ]);

  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tasks: tasks.tasks || [],
    sessions: sessions.sessions || [],
    projects: projects.projects || [],
    hooks: hooks.hooks || [],
  };

  if (options.output) {
    writeFileSync(options.output, JSON.stringify(exportData, null, 2));
    console.log(`✅ Exported to ${options.output}`);
    console.log(`   Tasks:    ${exportData.tasks.length}`);
    console.log(`   Sessions: ${exportData.sessions.length}`);
    console.log(`   Projects: ${exportData.projects.length}`);
    console.log(`   Hooks:    ${exportData.hooks.length}`);
  } else {
    formatJson(exportData);
  }
}

/**
 * Import data from file
 */
async function importData(filePath: string, options: ImportOptions): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as ExportData;

  if (!data.version || !data.tasks) {
    console.error('Error: Invalid export file format');
    process.exit(1);
  }

  const result = await post<{ imported: { tasks: number; projects: number } }>(
    options.apiUrl,
    '/api/backup/import',
    { data, merge: options.merge ?? false }
  );

  if (options.json) {
    formatJson(result);
    return;
  }

  console.log('✅ Import complete');
  console.log(`   Tasks imported:    ${result.imported?.tasks ?? 0}`);
  console.log(`   Projects imported: ${result.imported?.projects ?? 0}`);
}

/**
 * Register data commands
 */
export function registerDataCommands(program: Command, getApiUrl: () => string): void {
  program
    .command('export')
    .description('Export data to JSON file')
    .option('-o, --output <file>', 'Output file path')
    .option('--json', 'Output as JSON to stdout')
    .action(async (opts) => {
      await exportData({ ...opts, apiUrl: getApiUrl() });
    });

  program
    .command('import <file>')
    .description('Import data from JSON file')
    .option('--merge', 'Merge with existing data instead of replacing')
    .option('--json', 'Output as JSON')
    .action(async (filePath, opts) => {
      await importData(filePath, { ...opts, apiUrl: getApiUrl() });
    });
}
