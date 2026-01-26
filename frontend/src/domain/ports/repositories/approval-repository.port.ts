import type { Approval, ApprovalStatus } from '../../entities';

export interface IApprovalRepository {
  findAll(sessionId?: string): Promise<Approval[]>;
  findById(id: string): Promise<Approval | null>;
  findPending(sessionId?: string): Promise<Approval[]>;
  create(approval: Omit<Approval, 'id' | 'createdAt'>): Promise<Approval>;
  update(id: string, data: Partial<Approval>): Promise<Approval>;
  updateStatus(id: string, status: ApprovalStatus, decidedBy?: string): Promise<Approval>;
  delete(id: string): Promise<void>;
}
