/**
 * Server Command
 * Start the NoteCode server
 */

import { Command } from 'commander';
import { networkInterfaces } from 'os';

interface ServerStartOptions {
  port?: string;
  noBrowser?: boolean;
}

/**
 * Get local network IP address
 */
function getLocalIP(): string | null {
  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Print ASCII banner
 */
function printBanner(version: string): void {
  console.log(`
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                                                                          ║
  ║   ███╗   ██╗ ██████╗ ████████╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗  ║
  ║   ████╗  ██║██╔═══██╗╚══██╔══╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝  ║
  ║   ██╔██╗ ██║██║   ██║   ██║   █████╗  ██║     ██║   ██║██║  ██║█████╗    ║
  ║   ██║╚██╗██║██║   ██║   ██║   ██╔══╝  ██║     ██║   ██║██║  ██║██╔══╝    ║
  ║   ██║ ╚████║╚██████╔╝   ██║   ███████╗╚██████╗╚██████╔╝██████╔╝███████╗  ║
  ║   ╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝  ║
  ║                                                                          ║
  ║   v${version.padEnd(8)} AI Coding Task Management                                    ║
  ╚══════════════════════════════════════════════════════════════════════════╝
`);
}

/**
 * Start the NoteCode server
 */
async function startServer(options: ServerStartOptions, version: string): Promise<void> {
  // Dynamic imports for server modules
  const { createServer } = await import('../../infrastructure/server/fastify.server.js');
  const { initializeDatabase, closeDatabase } = await import('../../infrastructure/database/connection.js');
  const { DEFAULT_PORT, findAvailablePort } = await import('../../infrastructure/server/port-utils.js');

  const HOST = process.env.HOST || '0.0.0.0';
  const NO_BROWSER = process.env.NO_BROWSER === 'true' || options.noBrowser;

  printBanner(version);

  try {
    const specifiedPort = options.port ? parseInt(options.port, 10) : null;
    const PORT = specifiedPort ?? await findAvailablePort(DEFAULT_PORT);

    console.log('  📦 Initializing database...');
    await initializeDatabase();

    console.log('  🌐 Starting server...');
    const server = await createServer();
    await server.listen({ port: PORT, host: HOST });

    const address = server.server.address();
    const actualPort = typeof address === 'object' && address !== null ? address.port : PORT;
    const localIP = getLocalIP();

    const localUrl = `http://localhost:${actualPort}`;
    const networkUrl = localIP ? `http://${localIP}:${actualPort}` : null;

    console.log(`
  ✅ NoteCode is ready!

     Local:    ${localUrl}${networkUrl ? `
     Network:  ${networkUrl}` : ''}

     Press Ctrl+C to stop
`);

    if (!NO_BROWSER) {
      try {
        const open = (await import('open')).default;
        await open(localUrl);
      } catch {
        console.log(`  💡 Open ${localUrl} in your browser`);
      }
    }

    // Graceful shutdown handler
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n  🛑 Received ${signal}, shutting down...`);
      const forceExit = setTimeout(() => {
        console.log('  ⚠️  Force exit');
        process.exit(0);
      }, 3000);

      try {
        await server.close();
        await closeDatabase();
        clearTimeout(forceExit);
        console.log('  👋 Goodbye!\n');
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExit);
        console.error('  Shutdown error:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error(`
  ❌ Failed to start NoteCode

  Error: ${error instanceof Error ? error.message : 'Unknown error'}

  Troubleshooting:
    1. Check if port is available: notecode server start -p 5000
    2. Check file permissions for data directory
    3. Run with --help for more options
`);
    process.exit(1);
  }
}

/**
 * Register server commands
 */
export function registerServerCommands(program: Command, version: string): void {
  const server = program.command('server').description('Server management');

  server
    .command('start')
    .description('Start the NoteCode server')
    .option('-p, --port <port>', 'Server port')
    .option('--no-browser', "Don't open browser automatically")
    .action(async (opts) => {
      await startServer(opts, version);
    });
}

/**
 * Check if running in legacy mode (direct invocation without subcommand)
 */
export function isLegacyInvocation(args: string[]): boolean {
  const knownCommands = [
    'server', 'task', 'session', 'approval', 'hook',
    'watch', 'status', 'agent', 'project',
    'help', '--help', '-h', '--version', '-V'
  ];
  
  if (args.length === 0) return true;
  if (args[0] === '-p' || args[0] === '--port' || args[0] === '--no-browser') return true;
  if (!knownCommands.includes(args[0]) && !args[0].startsWith('--api-url')) return true;
  
  return false;
}

/**
 * Handle legacy invocation (start server directly)
 */
export async function handleLegacyInvocation(args: string[], version: string): Promise<void> {
  const opts: ServerStartOptions = {};
  
  // Parse legacy flags
  const pIndex = args.indexOf('-p');
  if (pIndex !== -1 && args[pIndex + 1]) {
    opts.port = args[pIndex + 1];
  }
  
  const portIndex = args.findIndex(a => a.startsWith('--port='));
  if (portIndex !== -1) {
    opts.port = args[portIndex].split('=')[1];
  } else if (args.indexOf('--port') !== -1) {
    const pi = args.indexOf('--port');
    if (args[pi + 1]) opts.port = args[pi + 1];
  }
  
  opts.noBrowser = args.includes('--no-browser');
  
  await startServer(opts, version);
}
