/**
 * Approval Repository Port
 * Interface for approval data access
 */

import { Approval, ApprovalStatus } from '../../entities/approval.entity.js';

export interface ApprovalFilters {
  sessionId?: string;
  status?: ApprovalStatus[];
  toolName?: string;
}

export interface IApprovalRepository {
  findById(id: string): Promise<Approval | null>;
  findBySessionId(sessionId: string): Promise<Approval[]>;
  findPending(): Promise<Approval[]>;
  findPendingBySessionId(sessionId: string): Promise<Approval[]>;
  findExpired(): Promise<Approval[]>;
  save(approval: Approval): Promise<Approval>;
  delete(id: string): Promise<boolean>;
}
