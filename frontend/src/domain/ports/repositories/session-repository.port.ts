import type { Session, SessionStatus } from '../../entities';

export interface SessionFilters {
  taskId?: string;
  agentId?: string;
  status?: SessionStatus;
  provider?: string;
}

export interface ISessionRepository {
  findAll(filters?: SessionFilters): Promise<Session[]>;
  findById(id: string): Promise<Session | null>;
  findByProviderSessionId(providerSessionId: string): Promise<Session | null>;
  findByTask(taskId: string): Promise<Session[]>;
  create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session>;
  update(id: string, data: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: SessionStatus): Promise<Session>;
}
