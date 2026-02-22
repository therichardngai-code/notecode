/**
 * NoteCode CLI - Project Commands
 * Project management operations
 */

import { Command } from 'commander';
import {
  listProjects,
  getProject,
  getRecentProjects,
  switchProject,
  getSettings,
} from '../api.js';
import {
  formatProjectHeader,
  formatProjectRow,
  formatProjectDetails,
  printError,
  printSuccess,
} from '../formatters.js';

/**
 * Create the project command group
 */
export function createProjectCommands() {
  const project = new Command('project')
    .description('Project management');

  // notecode project list
  project
    .command('list')
    .description('List all projects')
    .option('--favorite', 'Show only favorite projects')
    .option('--recent [limit]', 'Show recent projects (default: 10)')
    .option('-s, --search <query>', 'Search projects by name')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        let projects;
        
        if (opts.recent !== undefined) {
          const limit = typeof opts.recent === 'string' ? parseInt(opts.recent, 10) : 10;
          const result = await getRecentProjects(limit);
          projects = result.projects;
        } else {
          const result = await listProjects({
            search: opts.search,
            favorite: opts.favorite,
          });
          projects = result.projects;
        }
        
        // Get active project from settings
        const settings = await getSettings();
        const activeProjectId = settings.currentActiveProjectId;
        
        if (opts.json) {
          console.log(JSON.stringify({ projects, activeProjectId }, null, 2));
          return;
        }
        
        if (projects.length === 0) {
          console.log('No projects found');
          return;
        }
        
        console.log(formatProjectHeader());
        console.log('-'.repeat(100));
        for (const proj of projects) {
          console.log(formatProjectRow(proj, proj.id === activeProjectId));
        }
        console.log('');
        console.log(`Total: ${projects.length} project(s)`);
        if (activeProjectId) {
          console.log(`Active: ${activeProjectId.slice(0, 8)}...`);
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // notecode project get <id>
  project
    .command('get <id>')
    .description('Get project details')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const result = await getProject(id);
        const project = result.project;
        
        // Get active project from settings
        const settings = await getSettings();
        const isActive = settings.currentActiveProjectId === project.id;
        
        if (opts.json) {
          console.log(JSON.stringify({ project, isActive }, null, 2));
          return;
        }
        
        console.log(formatProjectDetails(project, isActive));
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // notecode project switch <id>
  project
    .command('switch <id>')
    .description('Switch active project')
    .action(async (id) => {
      try {
        // Verify project exists first
        const result = await getProject(id);
        const project = result.project;
        
        // Switch active project
        await switchProject(id);
        
        printSuccess(`Switched to project: ${project.name}`);
        console.log(`  Path: ${project.path}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // notecode project current
  project
    .command('current')
    .description('Show current active project')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const settings = await getSettings();
        
        if (!settings.currentActiveProjectId) {
          if (opts.json) {
            console.log(JSON.stringify({ project: null }, null, 2));
          } else {
            console.log('No active project set. Use "notecode project switch <id>" to set one.');
          }
          return;
        }
        
        const result = await getProject(settings.currentActiveProjectId);
        const project = result.project;
        
        if (opts.json) {
          console.log(JSON.stringify({ project }, null, 2));
          return;
        }
        
        console.log(formatProjectDetails(project, true));
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  return project;
}
