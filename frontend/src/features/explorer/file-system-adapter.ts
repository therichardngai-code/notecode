import type { IFileSystem } from '../../domain/ports/gateways/file-system.port';

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  hasChildren?: boolean; // true = folder has unloaded children (lazy loading)
}

export class BrowserFileSystemAdapter implements IFileSystem {
  private mockFiles: Map<string, string> = new Map();
  private mockDirs: Set<string> = new Set(['/']);

  constructor() {
    this.initializeMockFiles();
  }

  private initializeMockFiles(): void {
    this.mockFiles.set('/README.md', '# Project\n\nWelcome to the project.');
    this.mockFiles.set('/src/index.ts', 'export const main = () => {\n  console.log("Hello");\n};');
    this.mockFiles.set('/src/utils/helpers.ts', 'export const helper = () => {};');
    this.mockDirs.add('/src');
    this.mockDirs.add('/src/utils');
  }

  async readFile(path: string): Promise<string> {
    const content = this.mockFiles.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.mockFiles.set(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    this.mockFiles.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.mockFiles.has(path) || this.mockDirs.has(path);
  }

  async createDirectory(path: string): Promise<void> {
    this.mockDirs.add(path);
  }

  async listFiles(path: string): Promise<string[]> {
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
    const entries: string[] = [];

    for (const dir of this.mockDirs) {
      // Skip the root directory itself and ensure we only get direct children
      if (dir !== '/' && dir.startsWith(normalizedPath + '/')) {
        const relative = dir.slice(normalizedPath.length + 1);
        // Only include direct children (no nested paths)
        if (relative && !relative.includes('/')) {
          entries.push(relative + '/');
        }
      }
    }

    for (const filePath of this.mockFiles.keys()) {
      if (filePath.startsWith(normalizedPath + '/')) {
        const relative = filePath.slice(normalizedPath.length + 1);
        // Only include direct children (no nested paths)
        if (relative && !relative.includes('/')) {
          entries.push(relative);
        }
      }
    }

    return entries.sort();
  }

  async getStats(path: string): Promise<{ size: number; mtime: Date }> {
    const content = this.mockFiles.get(path);
    return {
      size: content?.length ?? 0,
      mtime: new Date(),
    };
  }

  async buildFileTree(rootPath = '/'): Promise<FileTreeNode> {
    // Normalize the path - remove trailing slash except for root
    const normalizedRoot = rootPath === '/' ? '/' : rootPath.replace(/\/$/, '');
    const isDir = this.mockDirs.has(normalizedRoot);
    const node: FileTreeNode = {
      name: normalizedRoot === '/' ? 'root' : normalizedRoot.split('/').pop() ?? '',
      path: normalizedRoot,
      isDirectory: isDir,
    };

    if (isDir) {
      const entries = await this.listFiles(normalizedRoot);
      node.children = [];
      for (const entry of entries) {
        // Remove trailing slash from directory entries for path construction
        const cleanEntry = entry.endsWith('/') ? entry.slice(0, -1) : entry;
        const childPath = normalizedRoot === '/' ? `/${cleanEntry}` : `${normalizedRoot}/${cleanEntry}`;
        const childNode = await this.buildFileTree(childPath);
        node.children.push(childNode);
      }
    }

    return node;
  }
}

export const fileSystemAdapter = new BrowserFileSystemAdapter();
