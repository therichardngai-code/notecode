import type { IFileSystem } from '../domain/ports/gateways/file-system.port';

export class ReadFileUseCase {
  fileSystem: IFileSystem;

  constructor(fileSystem: IFileSystem) {
    this.fileSystem = fileSystem;
  }

  async execute(filePath: string): Promise<string> {
    try {
      const exists = await this.fileSystem.exists(filePath);
      if (!exists) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = await this.fileSystem.readFile(filePath);
      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
      throw new Error('Failed to read file: Unknown error');
    }
  }
}
