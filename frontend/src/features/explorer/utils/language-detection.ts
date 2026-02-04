/**
 * Language detection for Monaco editor
 * Maps file extensions to Monaco language IDs
 */

const EXTENSION_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',

  // Data
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  toml: 'toml',

  // Markdown
  md: 'markdown',
  mdx: 'markdown',

  // Backend
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  rb: 'ruby',
  php: 'php',

  // Shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',

  // Config
  dockerfile: 'dockerfile',
  gitignore: 'ini',
  env: 'ini',

  // SQL
  sql: 'sql',

  // C/C++
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
};

// Special filenames without extensions
const FILENAME_MAP: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  '.gitignore': 'ini',
  '.env': 'ini',
  '.env.local': 'ini',
  '.env.example': 'ini',
};

/**
 * Detect Monaco language from file path
 */
export function detectLanguage(filePath: string): string {
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';

  // Check filename first (for files like Dockerfile, .gitignore)
  if (FILENAME_MAP[fileName]) {
    return FILENAME_MAP[fileName];
  }

  // Get extension
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  return EXTENSION_MAP[ext] || 'plaintext';
}
