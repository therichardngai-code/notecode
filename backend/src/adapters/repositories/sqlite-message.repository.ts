/**
 * SQLite Message Repository
 * Implements IMessageRepository using Drizzle ORM
 */

import { eq, desc, and, lt, sql } from 'drizzle-orm';
import { IMessageRepository, MessageFilters } from '../../domain/ports/repositories/message.repository.port.js';
import { Message } from '../../domain/entities/message.entity.js';
import { Block, MessageRole } from '../../domain/value-objects/block-types.vo.js';
import { messages, MessageRow } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';

export class SqliteMessageRepository implements IMessageRepository {
  async findById(id: string): Promise<Message | null> {
    const db = getDatabase();
    const row = await db.query.messages.findFirst({
      where: eq(messages.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findBySessionId(sessionId: string, filters?: MessageFilters): Promise<Message[]> {
    const db = getDatabase();
    let query = db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      orderBy: [desc(messages.timestamp)],
    });

    const rows = await query;
    let result = rows.map(row => this.toEntity(row));

    // Apply filters
    if (filters?.role) {
      result = result.filter(m => m.role === filters.role);
    }
    if (filters?.hasToolUse !== undefined) {
      result = result.filter(m => m.hasToolUse() === filters.hasToolUse);
    }

    // Return in chronological order
    return result.reverse();
  }

  async findRecent(sessionId: string, limit: number = 50): Promise<Message[]> {
    const db = getDatabase();
    const rows = await db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      orderBy: [desc(messages.timestamp)],
      limit,
    });

    // Return in chronological order
    return rows.map(row => this.toEntity(row)).reverse();
  }

  async findByProviderSessionId(providerSessionId: string, limit: number = 200): Promise<Message[]> {
    const db = getDatabase();
    // Join messages with sessions to find all messages for same conversation
    const rows = db.all<MessageRow>(sql`
      SELECT m.* FROM messages m
      JOIN sessions s ON m.session_id = s.id
      WHERE s.provider_session_id = ${providerSessionId}
      ORDER BY m.timestamp ASC
      LIMIT ${limit}
    `);

    return rows.map(row => this.toEntity(row));
  }

  async save(message: Message): Promise<Message> {
    const db = getDatabase();
    const data = this.toRow(message);

    await db.insert(messages).values(data).onConflictDoNothing();
    return message;
  }

  async saveBatch(messageList: Message[]): Promise<Message[]> {
    const db = getDatabase();
    const dataList = messageList.map(m => this.toRow(m));

    if (dataList.length > 0) {
      await db.insert(messages).values(dataList).onConflictDoNothing();
    }

    return messageList;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.changes > 0;
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const db = getDatabase();
    const result = await db.delete(messages).where(eq(messages.sessionId, sessionId));
    return result.changes;
  }

  async countBySessionId(sessionId: string): Promise<number> {
    const db = getDatabase();
    const rows = await db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      columns: { id: true },
    });
    return rows.length;
  }

  /**
   * Get messages with pagination (for chat history)
   */
  async findPaginated(
    sessionId: string,
    options: { limit?: number; before?: string }
  ): Promise<Message[]> {
    const db = getDatabase();
    const limit = options.limit ?? 50;

    // If before is provided, get messages before that timestamp
    if (options.before) {
      const rows = await db.query.messages.findMany({
        where: and(
          eq(messages.sessionId, sessionId),
          lt(messages.timestamp, options.before)
        ),
        orderBy: [desc(messages.timestamp)],
        limit,
      });
      return rows.map(row => this.toEntity(row)).reverse();
    }

    // Get most recent messages
    const rows = await db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      orderBy: [desc(messages.timestamp)],
      limit,
    });
    return rows.map(row => this.toEntity(row)).reverse();
  }

  private toEntity(row: MessageRow): Message {
    const blocks: Block[] = row.blocks ? JSON.parse(row.blocks) : [];
    const toolInput = row.toolInput ? JSON.parse(row.toolInput) : null;

    return new Message(
      row.id,
      row.sessionId,
      row.role as MessageRole,
      blocks,
      new Date(row.timestamp!),
      row.tokenCount ?? null,
      row.toolName ?? null,
      toolInput,
      row.toolResult ?? null,
      row.approvalId ?? null
    );
  }

  private toRow(message: Message): typeof messages.$inferInsert {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      blocks: JSON.stringify(message.blocks),
      timestamp: message.timestamp.toISOString(),
      tokenCount: message.tokenCount,
      toolName: message.toolName,
      toolInput: message.toolInput ? JSON.stringify(message.toolInput) : null,
      toolResult: message.toolResult,
      approvalId: message.approvalId,
    };
  }
}
