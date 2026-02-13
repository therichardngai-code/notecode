#!/usr/bin/env node

/**
 * NoteCode CLI Entry Point
 * Usage: npx notecode [command] [options]
 * 
 * This is a thin wrapper that delegates to the TypeScript CLI.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// Import and run the TypeScript CLI
try {
  const { runCLI } = await import('../dist/cli/index.js');
  await runCLI(pkg.version);
} catch (error) {
  // If TypeScript CLI not built yet, show helpful error
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.error('Error: CLI not built. Run `npm run build` first.');
    console.error('');
    console.error('Or use the legacy CLI:');
    console.error('  node backend/bin/cli.js.reference');
    process.exit(1);
  }
  throw error;
}
