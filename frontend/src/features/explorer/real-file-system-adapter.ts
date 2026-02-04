/**
 * Real File System Adapter
 * Uses backend API to access actual project files
 */

import type { IFileSystem } from '@/domain/ports/gateways/file-system.port';
import { filesApi, type FileNode, type GetTreeOptions } from '@/adapters/api/files-api';
import type { FileTreeNode } from './file-system-adapter';

export class RealFileSystemAdapter implements IFileSystem {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async readFile(path: string): Promise<string> {
    const response = await filesApi.readFile(this.projectId, path);
    return response.content;
  }

  async buildFileTree(rootPath = '/', options?: GetTreeOptions): Promise<FileTreeNode> {
    const response = await filesApi.getTree(this.projectId, rootPath, options);
    return this.convertToFileTreeNode(response.tree);
  }

  private convertToFileTreeNode(node: FileNode): FileTreeNode {
    return {
      name: node.name,
      path: node.path,
      isDirectory: node.type === 'directory',
      children: node.children?.map((child) => this.convertToFileTreeNode(child)),
      hasChildren: node.hasChildren, // Preserve lazy loading flag
    };
  }

  // Stub methods (not needed for read-only explorer)
  async writeFile(): Promise<void> {
    throw new Error('Write operations not supported in read-only mode');
  }

  async deleteFile(): Promise<void> {
    throw new Error('Delete operations not supported in read-only mode');
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(): Promise<void> {
    throw new Error('Create operations not supported in read-only mode');
  }

  async listFiles(): Promise<string[]> {
    throw new Error('Use buildFileTree instead');
  }

  async getStats() {
    return { size: 0, mtime: new Date() };
  }
}
