import type { IFileSystem } from '../domain/ports/gateways/file-system.port';

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export class ListDirectoryUseCase {
  fileSystem: IFileSystem;

  constructor(fileSystem: IFileSystem) {
    this.fileSystem = fileSystem;
  }

  async execute(directoryPath: string): Promise<DirectoryEntry[]> {
    try {
      const exists = await this.fileSystem.exists(directoryPath);
      if (!exists) {
        throw new Error(`Directory not found: ${directoryPath}`);
      }

      const entries = await this.fileSystem.listFiles(directoryPath);

      const directoryEntries: DirectoryEntry[] = entries.map((name) => {
        const isDirectory = name.endsWith('/');
        const cleanName = isDirectory ? name.slice(0, -1) : name;
        const fullPath = `${directoryPath}/${cleanName}`.replace('//', '/');

        return {
          name: cleanName,
          path: fullPath,
          isDirectory,
        };
      });

      return directoryEntries;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list directory: ${error.message}`);
      }
      throw new Error('Failed to list directory: Unknown error');
    }
  }
}
