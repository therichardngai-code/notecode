export interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  createDirectory(path: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  getStats(path: string): Promise<{ size: number; mtime: Date }>;
}
