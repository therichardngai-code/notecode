#!/usr/bin/env node

/**
 * NoteCode CLI
 * Command-line interface for managing tasks, sessions, projects, and agents
 * 
 * Usage:
 *   notecode                              Start the NoteCode server (default)
 *   notecode serve [-p <port>]            Start the NoteCode server
 *   notecode task list [--status <s>]     List tasks
 *   notecode task get <id> [--json]       Get task details
 *   notecode task create --title "..."    Create a task
 *   notecode task update <id> [options]   Update a task
 *   notecode session list [--task-id <id>]  List sessions
 *   notecode session status <id>          Get session details
 *   notecode approval list [--session <id>]  List pending approvals
 *   notecode approval get <id>            Get approval details
 *   notecode approval approve <id>        Approve a request
 *   notecode approval reject <id> -r      Reject a request (reason required)
 *   notecode watch [--json]               Real-time activity monitoring
 *   notecode status [--json]              Show system status summary
 *   notecode project list [--favorite]    List all projects
 *   notecode project get <id> [--json]    Get project details
 *   notecode project switch <id>          Switch active project
 *   notecode project current              Show current active project
 *   notecode agent list [--project <id>]  List discovered agents
 *   notecode agent get <name>             Get agent details
 *   notecode agent skills                 List available skills
 *   notecode agent spawn --task <id>      Spawn agent (experimental)
 */

import { Command } from 'commander';
import { createTaskCommands } from './src/commands/task.js';
import { createSessionCommands } from './src/commands/session.js';
import { createApprovalCommands } from './src/commands/approval.js';
import { createWatchCommand } from './src/commands/watch.js';
import { createStatusCommand } from './src/commands/status.js';
import { createProjectCommands } from './src/commands/project.js';
import { createAgentCommands } from './src/commands/agent.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

// Get version from root package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let version = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
  version = pkg.version;
} catch {
  // Ignore
}

/**
 * Start the NoteCode server using the existing backend CLI
 */
function startServer(args = []) {
  const serverCli = join(__dirname, '../backend/bin/cli.js');
  const child = spawn('node', [serverCli, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

// Check if we should start the server (no subcommand, or server-related flags)
const args = process.argv.slice(2);
const serverFlags = ['-p', '--port', '--no-browser'];
const subcommands = ['task', 'session', 'approval', 'watch', 'status', 'serve', 'help', '--help', '-h', '--version', '-V'];

// If no args, or only server flags, start the server
const hasSubcommand = args.some(arg => subcommands.includes(arg));
const hasOnlyServerFlags = args.length > 0 && args.every(arg => 
  serverFlags.includes(arg) || 
  (args.indexOf(arg) > 0 && serverFlags.includes(args[args.indexOf(arg) - 1]))
);

if (args.length === 0 || (hasOnlyServerFlags && !hasSubcommand)) {
  startServer(args);
} else {
  // Run management CLI
  const program = new Command();

  program
    .name('notecode')
    .description('NoteCode CLI - AI Coding Task Management')
    .version(version);

  // Server command (explicit)
  program
    .command('serve')
    .description('Start the NoteCode server')
    .option('-p, --port <port>', 'Server port')
    .option('--no-browser', 'Do not open browser automatically')
    .action((opts) => {
      const serverArgs = [];
      if (opts.port) serverArgs.push('-p', opts.port);
      if (opts.browser === false) serverArgs.push('--no-browser');
      startServer(serverArgs);
    });

  // Register management subcommands
  program.addCommand(createTaskCommands());
  program.addCommand(createSessionCommands());
  program.addCommand(createApprovalCommands());
  program.addCommand(createWatchCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createProjectCommands());
  program.addCommand(createAgentCommands());

  // Parse and execute
  program.parse();
}
