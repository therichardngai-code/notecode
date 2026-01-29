/**
 * Message Repository Port
 * Interface for message data access
 */

import { Message } from '../../entities/message.entity.js';
import { MessageRole } from '../../value-objects/block-types.vo.js';

export interface MessageFilters {
  role?: MessageRole;
  hasToolUse?: boolean;
}

export interface IMessageRepository {
  findById(id: string): Promise<Message | null>;
  findBySessionId(sessionId: string, filters?: MessageFilters): Promise<Message[]>;
  findRecent(sessionId: string, limit?: number): Promise<Message[]>;
  findByProviderSessionId(providerSessionId: string, limit?: number): Promise<Message[]>;
  save(message: Message): Promise<Message>;
  saveBatch(messages: Message[]): Promise<Message[]>;
  delete(id: string): Promise<boolean>;
  deleteBySessionId(sessionId: string): Promise<number>;
  countBySessionId(sessionId: string): Promise<number>;

  // Streaming support
  /** Find active streaming message for session (status='streaming') */
  findStreamingBySessionId(sessionId: string): Promise<Message | null>;
  /** Append delta content to streaming message, update offset */
  appendContent(messageId: string, delta: string): Promise<void>;
  /** Mark streaming message as complete */
  markComplete(messageId: string): Promise<void>;
}
