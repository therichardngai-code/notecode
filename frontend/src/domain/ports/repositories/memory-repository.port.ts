import type { UserMemory, CrossSessionMemory } from '../../value-objects';

export interface IMemoryRepository {
  // User memories (SQLite)
  findAllUserMemories(projectId?: string): Promise<UserMemory[]>;
  findUserMemoryById(id: string): Promise<UserMemory | null>;
  createUserMemory(memory: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserMemory>;
  updateUserMemory(id: string, data: Partial<UserMemory>): Promise<UserMemory>;
  deleteUserMemory(id: string): Promise<void>;

  // Cross-session memories (LanceDB)
  searchCrossSessionMemories(query: string, projectId: string, limit?: number): Promise<CrossSessionMemory[]>;
  createCrossSessionMemory(memory: CrossSessionMemory): Promise<void>;
  deleteCrossSessionMemory(id: string): Promise<void>;
  cleanupOldMemories(olderThanDays: number): Promise<void>;
}
