import type { Message } from '../../entities';

export interface IMessageRepository {
  findAll(sessionId: string): Promise<Message[]>;
  findById(id: string): Promise<Message | null>;
  create(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message>;
  update(id: string, data: Partial<Message>): Promise<Message>;
  delete(id: string): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
}
