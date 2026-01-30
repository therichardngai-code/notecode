/**
 * Language detection utility for syntax highlighting
 * Maps file extensions to Prism language identifiers
 */

/**
 * Maps file extensions to Prism language identifiers
 */
export const languageMap: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Web
  '.html': 'markup',
  '.htm': 'markup',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',

  // Config/Data
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'markup',

  // Backend
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cs': 'csharp',

  // Shell/Config
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.env': 'bash',

  // Markdown/Docs
  '.md': 'markdown',
  '.mdx': 'markdown',

  // SQL
  '.sql': 'sql',

  // Other
  '.graphql': 'graphql',
  '.proto': 'protobuf',
  '.dockerfile': 'docker',
  '.vue': 'markup',
  '.svelte': 'markup',
};

/**
 * Special files without extensions
 */
const specialFiles: Record<string, string> = {
  'dockerfile': 'docker',
  'makefile': 'makefile',
  'jenkinsfile': 'groovy',
  'vagrantfile': 'ruby',
  'gemfile': 'ruby',
  'rakefile': 'ruby',
  'readme': 'markdown',
  'license': 'text',
  'changelog': 'markdown',
};

/**
 * Detects programming language from file path
 * @param filePath - Full file path or filename
 * @returns Prism language identifier or 'text' as fallback
 */
export function detectLanguage(filePath: string): string {
  if (!filePath) return 'text';

  // Handle special cases (no extension)
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';

  if (specialFiles[fileName]) {
    return specialFiles[fileName];
  }

  // Extract extension
  const match = filePath.match(/(\.[^.]+)$/);
  if (!match) return 'text';

  const ext = match[1].toLowerCase();
  return languageMap[ext] || 'text';
}

/**
 * Gets user-friendly language name for display
 * @param language - Prism language identifier
 * @returns Human-readable language name
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'jsx': 'React JSX',
    'tsx': 'React TSX',
    'python': 'Python',
    'go': 'Go',
    'rust': 'Rust',
    'java': 'Java',
    'kotlin': 'Kotlin',
    'ruby': 'Ruby',
    'php': 'PHP',
    'c': 'C',
    'cpp': 'C++',
    'csharp': 'C#',
    'markup': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'markdown': 'Markdown',
    'json': 'JSON',
    'yaml': 'YAML',
    'toml': 'TOML',
    'xml': 'XML',
    'bash': 'Shell',
    'sql': 'SQL',
    'graphql': 'GraphQL',
    'docker': 'Docker',
    'protobuf': 'Protobuf',
    'makefile': 'Makefile',
    'groovy': 'Groovy',
    'text': 'Plain Text',
  };

  return displayNames[language] || language.toUpperCase();
}

/**
 * Checks if file is binary based on extension
 * @param filePath - Full file path
 * @returns true if binary file
 */
export function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.avi', '.mov',
    '.woff', '.woff2', '.ttf', '.eot',
  ];

  const lowerPath = filePath.toLowerCase();
  return binaryExtensions.some(ext => lowerPath.endsWith(ext));
}
