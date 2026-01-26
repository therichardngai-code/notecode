/**
 * Memory Repository Port
 * Interface for cross-session memory storage operations
 */

import { CrossSessionMemory, MemorySearchResult } from '../../entities/memory.entity.js';

export interface MemoryFilters {
  category?: string;
  limit?: number;
}

export interface IMemoryRepository {
  /** Save memory with embedding generation */
  save(memory: CrossSessionMemory): Promise<CrossSessionMemory>;

  /** Search similar memories by vector similarity */
  searchSimilar(query: string, projectId: string, limit?: number): Promise<MemorySearchResult[]>;

  /** Find memories by session */
  findBySession(sessionId: string): Promise<CrossSessionMemory[]>;

  /** Find memories by project with optional filters */
  findByProject(projectId: string, filters?: MemoryFilters): Promise<CrossSessionMemory[]>;

  /** Delete memory by ID */
  delete(id: string): Promise<boolean>;

  /** Delete all memories for a session */
  deleteBySession(sessionId: string): Promise<number>;
}
