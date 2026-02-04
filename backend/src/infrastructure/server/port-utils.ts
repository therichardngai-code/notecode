/**
 * Port Utilities
 * Smart port detection to avoid conflicts when starting NoteCode server
 */

import { createServer } from 'net';

/** Default port for NoteCode (unique, unlikely to conflict) */
export const DEFAULT_PORT = 41920;

/** Maximum attempts to find available port */
export const MAX_PORT_ATTEMPTS = 10;

/**
 * Check if a port is available for binding
 * @param port - Port number to check
 * @returns Promise resolving to true if port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find first available port starting from startPort
 * Auto-increments if port is occupied (up to maxAttempts)
 *
 * @param startPort - Port to start searching from (default: 41920)
 * @param maxAttempts - Maximum ports to try (default: 10)
 * @returns Promise resolving to available port number
 * @throws Error if no available port found in range
 */
export async function findAvailablePort(
  startPort: number = DEFAULT_PORT,
  maxAttempts: number = MAX_PORT_ATTEMPTS
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);

    if (available) {
      if (i > 0) {
        console.log(`⚠️  Port ${startPort} in use, using ${port}`);
      }
      return port;
    }
  }

  throw new Error(
    `No available ports in range ${startPort}-${startPort + maxAttempts - 1}. ` +
    `Try specifying a different port with --port or PORT env variable.`
  );
}

/**
 * Parse port from CLI args or environment variables
 * Priority: --port/-p flag > PORT env > null
 *
 * @param args - CLI arguments array (process.argv.slice(2))
 * @returns Port number if specified, null otherwise
 */
export function parsePort(args: string[]): number | null {
  // Check --port or -p flag
  const portFlagIndex = args.findIndex(a => a === '--port' || a === '-p');
  if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
    const port = parseInt(args[portFlagIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
    console.warn(`⚠️  Invalid port "${args[portFlagIndex + 1]}", using default`);
  }

  // Check PORT env variable
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
    console.warn(`⚠️  Invalid PORT env "${process.env.PORT}", using default`);
  }

  return null;
}
