/**
 * LanceDB Memory Repository
 * Implements memory storage using LanceDB vector database
 */

import { IMemoryRepository, MemoryFilters } from '../../domain/ports/repositories/memory.repository.port.js';
import { CrossSessionMemory, MemorySearchResult } from '../../domain/entities/memory.entity.js';
import { IEmbeddingGateway } from '../../domain/ports/gateways/embedding.port.js';
import {
  getLanceDb,
  getOrCreateMemoryTable,
  MemoryRecord,
} from '../../infrastructure/database/lancedb.connection.js';
import type { Table } from '@lancedb/lancedb';

export class LanceDBMemoryRepository implements IMemoryRepository {
  private table: Table | null = null;

  constructor(private embeddingGateway: IEmbeddingGateway) {}

  private async getTable(): Promise<Table> {
    if (this.table) return this.table;

    const db = await getLanceDb();
    this.table = await getOrCreateMemoryTable(db, this.embeddingGateway.getDimensions());
    return this.table;
  }

  async save(memory: CrossSessionMemory): Promise<CrossSessionMemory> {
    const table = await this.getTable();

    // Generate embedding for searchable text
    const searchText = `${memory.category}: ${memory.summary}`;
    const vector = await this.embeddingGateway.embed(searchText);

    const record: MemoryRecord = {
      id: memory.id,
      text: searchText,
      vector,
      category: memory.category,
      summary: memory.summary,
      keywords: memory.keywords,
      timestamp: memory.timestamp,
      session: memory.sessionId,
      project: memory.projectId,
    };

    await table.add([record]);

    return { ...memory, vector };
  }

  async searchSimilar(
    query: string,
    projectId: string,
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    const table = await this.getTable();

    // Generate query embedding
    const queryVector = await this.embeddingGateway.embed(query);

    // Vector search with project filter
    const results = await table
      .vectorSearch(queryVector)
      .where(`project = '${projectId}'`)
      .limit(limit)
      .toArray();

    return results
      .filter((row) => row.id !== 'init')
      .map((row) => ({
        id: row.id as string,
        sessionId: row.session as string,
        projectId: row.project as string,
        category: row.category as CrossSessionMemory['category'],
        summary: row.summary as string,
        keywords: row.keywords as string,
        vector: row.vector as number[],
        timestamp: row.timestamp as string,
        score: (row._distance as number) ?? 0,
      }));
  }

  async findBySession(sessionId: string): Promise<CrossSessionMemory[]> {
    const table = await this.getTable();

    // Use zero vector for non-similarity search with filter
    const zeroVector = new Array(this.embeddingGateway.getDimensions()).fill(0);

    const results = await table
      .vectorSearch(zeroVector)
      .where(`session = '${sessionId}'`)
      .limit(1000)
      .toArray();

    return results
      .filter((row) => row.id !== 'init')
      .map((row) => this.toEntity(row));
  }

  async findByProject(
    projectId: string,
    filters?: MemoryFilters
  ): Promise<CrossSessionMemory[]> {
    const table = await this.getTable();

    const zeroVector = new Array(this.embeddingGateway.getDimensions()).fill(0);

    let whereClause = `project = '${projectId}'`;
    if (filters?.category) {
      whereClause += ` AND category = '${filters.category}'`;
    }

    const results = await table
      .vectorSearch(zeroVector)
      .where(whereClause)
      .limit(filters?.limit ?? 100)
      .toArray();

    return results
      .filter((row) => row.id !== 'init')
      .map((row) => this.toEntity(row));
  }

  async delete(id: string): Promise<boolean> {
    const table = await this.getTable();
    await table.delete(`id = '${id}'`);
    return true;
  }

  async deleteBySession(sessionId: string): Promise<number> {
    const before = await this.findBySession(sessionId);
    const table = await this.getTable();
    await table.delete(`session = '${sessionId}'`);
    return before.length;
  }

  private toEntity(row: Record<string, unknown>): CrossSessionMemory {
    return {
      id: row.id as string,
      sessionId: row.session as string,
      projectId: row.project as string,
      category: row.category as CrossSessionMemory['category'],
      summary: row.summary as string,
      keywords: row.keywords as string,
      vector: row.vector as number[],
      timestamp: row.timestamp as string,
    };
  }
}
