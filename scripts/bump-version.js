#!/usr/bin/env node

/**
 * Version Sync Script
 * Bumps version across all package.json files in the monorepo.
 *
 * Usage:
 *   node scripts/bump-version.js patch    # 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor    # 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major    # 1.0.0 -> 2.0.0
 *   node scripts/bump-version.js 2.5.0   # Set exact version
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_FILES = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
  'electron/package.json',
];

const root = path.resolve(__dirname, '..');

function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default:
      // Exact version string (e.g., "2.5.0" or "1.0.0-beta.1")
      if (/^\d+\.\d+\.\d+/.test(type)) return type;
      console.error(`Invalid bump type: "${type}". Use: patch | minor | major | x.y.z`);
      process.exit(1);
  }
}

function updatePackageVersion(filePath, newVersion) {
  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  Skip: ${filePath} (not found)`);
    return false;
  }
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const oldVersion = pkg.version;
  pkg.version = newVersion;
  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  ${filePath}: ${oldVersion} -> ${newVersion}`);
  return true;
}

// Main
const type = process.argv[2];
if (!type) {
  console.log('Usage: node scripts/bump-version.js <patch|minor|major|x.y.z>');
  console.log(`Current version: ${readVersion()}`);
  process.exit(0);
}

const current = readVersion();
const newVersion = bumpVersion(current, type);

console.log(`\nBumping version: ${current} -> ${newVersion}\n`);

let updated = 0;
for (const file of PACKAGE_FILES) {
  if (updatePackageVersion(file, newVersion)) updated++;
}

console.log(`\n${updated} files updated. Next steps:`);
console.log(`  git add -A && git commit -m "chore: bump version to v${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin main --tags`);
