/**
 * esbuild config for Electron main process
 * Bundles main.ts + auto-updater.ts + all dependencies into single files
 * Eliminates need for node_modules in packaged app
 */

import * as esbuild from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  // Mark electron as external (provided by Electron runtime)
  external: ['electron'],
};

// Bundle main process (includes auto-updater with electron-updater)
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
});

// Bundle preload script separately (runs in renderer context)
await esbuild.build({
  ...commonOptions,
  entryPoints: ['src/preload.ts'],
  outfile: 'dist/preload.js',
});

console.log('Build complete: dist/main.js, dist/preload.js');
