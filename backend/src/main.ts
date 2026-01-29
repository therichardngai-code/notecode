/**
 * NoteCode Backend - Main Entry Point
 * Initializes database and starts HTTP server
 */

import { createServer } from './infrastructure/server/fastify.server.js';
import { initializeDatabase, closeDatabase } from './infrastructure/database/connection.js';
import { SqliteSettingsRepository } from './adapters/repositories/sqlite-settings.repository.js';
import { DataRetentionService } from './domain/services/data-retention.service.js';

async function main(): Promise<void> {
  const PORT = parseInt(process.env.PORT ?? '3001', 10);
  const HOST = process.env.HOST ?? '0.0.0.0';

  console.log('Starting NoteCode backend...');

  // Initialize database
  await initializeDatabase();

  // Run data retention cleanup on startup
  const settingsRepo = new SqliteSettingsRepository();
  const retentionService = new DataRetentionService(settingsRepo);
  await retentionService.runCleanup();

  // Create and start server
  const server = await createServer();
  await server.listen({ port: PORT, host: HOST });

  console.log(`NoteCode backend running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
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
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
