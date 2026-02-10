/**
 * NoteCode CLI
 * Main entry point for CLI command registration
 */

import { Command } from 'commander';
import {
  registerTaskCommands,
  registerSessionCommands,
  registerApprovalCommands,
  registerWatchCommand,
  registerStatusCommand,
  registerHookCommands,
  registerAgentCommands,
  registerProjectCommands,
  registerDataCommands,
  registerServerCommands,
  isLegacyInvocation,
  handleLegacyInvocation,
} from './commands/index.js';

// Default API URL
export const DEFAULT_API_URL = 'http://localhost:41920';

/**
 * Create and configure the CLI program
 */
export function createProgram(version: string): Command {
  const program = new Command();

  program
    .name('notecode')
    .description('NoteCode - AI Coding Task Management')
    .version(version)
    .option('--api-url <url>', 'API server URL', DEFAULT_API_URL);

  // Helper to get API URL from global options
  const getApiUrl = (): string => program.opts().apiUrl ?? DEFAULT_API_URL;

  // Register command groups
  registerServerCommands(program, version);
  registerTaskCommands(program, getApiUrl);
  registerSessionCommands(program, getApiUrl);
  registerApprovalCommands(program, getApiUrl);
  registerWatchCommand(program, getApiUrl);
  registerStatusCommand(program, getApiUrl);
  registerHookCommands(program, getApiUrl);
  registerAgentCommands(program, getApiUrl);
  registerProjectCommands(program, getApiUrl);
  registerDataCommands(program, getApiUrl);

  return program;
}

/**
 * Run the CLI with given arguments
 * @param version Package version
 * @param args Command line arguments (defaults to process.argv.slice(2))
 */
export async function runCLI(version: string, args: string[] = process.argv.slice(2)): Promise<void> {
  // Check for legacy invocation (npx notecode without subcommand)
  if (isLegacyInvocation(args) && !args.includes('--help') && !args.includes('-h')) {
    await handleLegacyInvocation(args, version);
  } else {
    // Use commander for subcommand mode
    const program = createProgram(version);
    program.parse();
  }
}

// Re-export for use in entry point
export { isLegacyInvocation, handleLegacyInvocation } from './commands/index.js';
