#!/usr/bin/env node

/**
 * NoteCode CLI Entry Point
 * Usage: npx notecode [options]
 */

import { createServer } from '../dist/infrastructure/server/fastify.server.js';
import { initializeDatabase, closeDatabase } from '../dist/infrastructure/database/connection.js';
import {
  DEFAULT_PORT,
  findAvailablePort,
  parsePort,
} from '../dist/infrastructure/server/port-utils.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { networkInterfaces } from 'os';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const args = process.argv.slice(2);
const HOST = process.env.HOST || '0.0.0.0';
const NO_BROWSER = process.env.NO_BROWSER === 'true' || args.includes('--no-browser');

// Get local network IP
function getLocalIP() {
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
    // Ignore
  }
  return null;
}

// Handle --help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
NoteCode v${pkg.version} - AI Coding Task Management

Usage: npx notecode [options]

Options:
  -p, --port <port>   Server port (default: ${DEFAULT_PORT})
  --no-browser        Don't open browser automatically
  -h, --help          Show this help
  -v, --version       Show version

Environment Variables:
  PORT                Server port (default: ${DEFAULT_PORT})
  HOST                Server host (default: 0.0.0.0)
  NO_BROWSER          Set to 'true' to skip opening browser
  NOTECODE_DATA_DIR   Data directory (default: ~/.notecode)

Examples:
  npx notecode                    Start on default port
  npx notecode -p 5000            Start on port 5000
  npx notecode --no-browser       Start without opening browser
`);
  process.exit(0);
}

// Handle --version
if (args.includes('--version') || args.includes('-v')) {
  console.log(`notecode v${pkg.version}`);
  process.exit(0);
}

async function main() {
  // ASCII banner - NOTECODE
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
  ║   v${pkg.version.padEnd(8)} AI Coding Task Management                                    ║
  ╚══════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Determine port: CLI flag > env > auto-detect available port
    const specifiedPort = parsePort(args);
    const PORT = specifiedPort ?? await findAvailablePort(DEFAULT_PORT);

    // Initialize database
    console.log('  📦 Initializing database...');
    await initializeDatabase();

    // Create and start server
    console.log('  🌐 Starting server...');
    const server = await createServer();
    await server.listen({ port: PORT, host: HOST });

    // Get actual port (in case of dynamic allocation)
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

    // Open browser if not disabled
    if (!NO_BROWSER) {
      try {
        const open = (await import('open')).default;
        await open(localUrl);
      } catch {
        console.log(`  💡 Open ${localUrl} in your browser`);
      }
    }

    // Graceful shutdown with timeout
    const shutdown = async (signal) => {
      console.log(`\n  🛑 Received ${signal}, shutting down...`);

      // Force exit after 3 seconds if graceful shutdown hangs
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

  Error: ${error.message}

  Troubleshooting:
    1. Check if port is available: npx notecode -p 5000
    2. Check file permissions for data directory
    3. Run with --help for more options
`);
    process.exit(1);
  }
}

main();
