#!/usr/bin/env node

/**
 * NoteCode CLI
 * Command-line interface for managing tasks and sessions
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
 */

import { Command } from 'commander';
import { createTaskCommands } from './src/commands/task.js';
import { createSessionCommands } from './src/commands/session.js';
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
const subcommands = ['task', 'session', 'serve', 'help', '--help', '-h', '--version', '-V'];

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

  // Parse and execute
  program.parse();
}
