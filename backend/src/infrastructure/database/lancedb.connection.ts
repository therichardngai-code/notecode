/**
 * LanceDB Connection
 * Manages connection to LanceDB vector database
 */

import * as lancedb from '@lancedb/lancedb';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DATA_DIR = path.join(os.homedir(), '.notecode', 'data', 'vectors');

let dbInstance: lancedb.Connection | null = null;

/**
 * Get or create LanceDB connection
 */
export async function getLanceDb(): Promise<lancedb.Connection> {
  if (dbInstance) return dbInstance;

  // Ensure directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  dbInstance = await lancedb.connect(DATA_DIR);
  return dbInstance;
}

/**
 * Memory record schema for LanceDB
 * Uses index signature for compatibility with LanceDB API
 */
export interface MemoryRecord {
  [key: string]: unknown;
  id: string;
  text: string;
  vector: number[];
  category: string;
  summary: string;
  keywords: string;
  timestamp: string;
  session: string;
  project: string;
}

/**
 * Get or create the project_memories table
 */
export async function getOrCreateMemoryTable(
  db: lancedb.Connection,
  dimensions: number
): Promise<lancedb.Table> {
  const tableName = 'project_memories';

  const tableNames = await db.tableNames();

  if (tableNames.includes(tableName)) {
    return await db.openTable(tableName);
  }

  // Create with initial record (LanceDB requires at least one record)
  const initialRecord: MemoryRecord = {
    id: 'init',
    text: 'Initial record',
    vector: new Array(dimensions).fill(0),
    category: 'init',
    summary: 'Initial record',
    keywords: '',
    timestamp: new Date().toISOString(),
    session: '',
    project: '',
  };

  return await db.createTable(tableName, [initialRecord]);
}

/**
 * Close LanceDB connection (for cleanup)
 */
export function closeLanceDb(): void {
  dbInstance = null;
}
