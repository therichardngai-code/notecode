/**
 * NoteCode Backend - Main Entry Point
 * Supports both standalone web server and embedded Electron mode
 */

import { createServer } from './infrastructure/server/fastify.server.js';
import { initializeDatabase, closeDatabase } from './infrastructure/database/connection.js';
import { SqliteSettingsRepository } from './adapters/repositories/sqlite-settings.repository.js';
import { DataRetentionService } from './domain/services/data-retention.service.js';
import type { FastifyInstance } from 'fastify';

// Detect Electron environment
const isElectron = process.versions?.electron !== undefined;

/**
 * Start NoteCode backend server
 * @param options - Server options
 * @returns Fastify instance
 */
export async function startServer(options?: {
  port?: number;
  host?: string;
  silent?: boolean;
}): Promise<FastifyInstance> {
  const PORT = options?.port
    ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined)
    ?? (isElectron ? 0 : 3001);  // Random port in Electron, 3001 for web

  const HOST = options?.host ?? process.env.HOST ?? '0.0.0.0';
  const silent = options?.silent ?? false;

  if (!silent) {
    console.log('Starting NoteCode backend...');
    if (isElectron) {
      console.log('[Electron Mode] Using dynamic port allocation');
    }
  }

  // Initialize database
  await initializeDatabase();

  // Run data retention cleanup on startup
  const settingsRepo = new SqliteSettingsRepository();
  const retentionService = new DataRetentionService(settingsRepo);
  await retentionService.runCleanup();

  // Create and start server
  const server = await createServer();
  await server.listen({ port: PORT, host: HOST });

  // Get actual port (important for Electron PORT=0 case)
  const address = server.server.address();
  const actualPort = typeof address === 'object' && address !== null ? address.port : PORT;

  // CRITICAL: Electron reads this log to detect backend URL
  if (!silent) {
    console.log(`Server listening on http://localhost:${actualPort}`);
    console.log(`Health check: http://localhost:${actualPort}/health`);
  }

  return server;
}

/**
 * Graceful shutdown handler
 */
async function shutdown(server: FastifyInstance, signal: string): Promise<void> {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  try {
    await server.close();
    await closeDatabase();
    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Main entry point (only when run directly, not imported by Electron)
 */
async function main(): Promise<void> {
  try {
    const server = await startServer();

    // Register shutdown handlers
    process.on('SIGINT', () => shutdown(server, 'SIGINT'));
    process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run main() when executed as entry point
// Works for direct execution, Electron spawn, and npm scripts
const isMainModule = process.argv[1]?.includes('main.js') || process.argv[1]?.includes('main.ts');

if (isMainModule) {
  main();
}
