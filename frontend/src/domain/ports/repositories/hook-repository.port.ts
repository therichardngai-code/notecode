import type { Hook } from '../../value-objects';

export interface IHookRepository {
  findAll(): Promise<Hook[]>;
  findById(id: string): Promise<Hook | null>;
  findByEvent(event: string): Promise<Hook[]>;
  findEnabled(): Promise<Hook[]>;
  create(hook: Omit<Hook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Hook>;
  update(id: string, data: Partial<Hook>): Promise<Hook>;
  delete(id: string): Promise<void>;
  toggleEnabled(id: string): Promise<Hook>;
}
