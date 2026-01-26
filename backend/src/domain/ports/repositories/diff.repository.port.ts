/**
 * Diff Repository Port
 * Interface for diff/file-change data access
 */

import { Diff, DiffStatus } from '../../entities/diff.entity.js';

export interface DiffFilters {
  sessionId?: string;
  status?: DiffStatus[];
  filePath?: string;
}

export interface IDiffRepository {
  findById(id: string): Promise<Diff | null>;
  findBySessionId(sessionId: string): Promise<Diff[]>;
  findByApprovalId(approvalId: string): Promise<Diff[]>;
  findByToolUseId(toolUseId: string): Promise<Diff | null>;
  findPending(): Promise<Diff[]>;
  findByFilePath(sessionId: string, filePath: string): Promise<Diff[]>;
  save(diff: Diff): Promise<Diff>;
  delete(id: string): Promise<boolean>;
}
