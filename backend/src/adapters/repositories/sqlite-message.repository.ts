/**
 * SQLite Message Repository
 * Implements IMessageRepository using Drizzle ORM
 */

import { eq, desc, and, lt, sql } from 'drizzle-orm';
import { IMessageRepository, MessageFilters, FindByTaskIdOptions } from '../../domain/ports/repositories/message.repository.port.js';
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
   * Find all messages for a task (across all sessions)
   * Returns messages grouped by session in chronological order
   */
  async findByTaskId(taskId: string, options?: FindByTaskIdOptions): Promise<Message[]> {
    const db = getDatabase();
    const limit = options?.limit ?? 200;
    const sessionIds = options?.sessionIds;

    // Build query with optional sessionIds filter
    if (sessionIds && sessionIds.length > 0) {
      // With sessionIds filter - use sql tagged template with IN clause
      // Build the IN clause values list
      const sessionIdsSql = sql.join(
        sessionIds.map(id => sql`${id}`),
        sql`, `
      );

      const query = sql`
        SELECT m.* FROM messages m
        JOIN sessions s ON m.session_id = s.id
        WHERE s.task_id = ${taskId}
        AND m.session_id IN (${sessionIdsSql})
        ORDER BY s.created_at ASC, m.timestamp ASC
        LIMIT ${limit}
      `;
      const rows = db.all<MessageRow>(query);
      return rows.map(row => this.toEntity(row));
    } else {
      // No filter (backward compatible)
      const query = sql`
        SELECT m.* FROM messages m
        JOIN sessions s ON m.session_id = s.id
        WHERE s.task_id = ${taskId}
        ORDER BY s.created_at ASC, m.timestamp ASC
        LIMIT ${limit}
      `;
      const rows = db.all<MessageRow>(query);
      return rows.map(row => this.toEntity(row));
    }
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

  // === Streaming Support ===

  /**
   * Find active streaming message for session
   */
  async findStreamingBySessionId(sessionId: string): Promise<Message | null> {
    const db = getDatabase();
    const row = await db.query.messages.findFirst({
      where: and(
        eq(messages.sessionId, sessionId),
        eq(messages.status, 'streaming')
      ),
    });
    return row ? this.toEntity(row) : null;
  }

  /**
   * Append delta content to streaming message
   */
  async appendContent(messageId: string, delta: string): Promise<void> {
    const db = getDatabase();

    // Get current message
    const row = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });
    if (!row) return;

    // Parse current blocks and append to text content
    const blocks = row.blocks ? JSON.parse(row.blocks) : [];
    const textBlock = blocks.find((b: { type: string }) => b.type === 'text');
    if (textBlock) {
      textBlock.content += delta;
    } else {
      blocks.push({ type: 'text', content: delta });
    }

    // Update with new content and offset
    const newOffset = (row.streamOffset ?? 0) + delta.length;
    await db.update(messages)
      .set({
        blocks: JSON.stringify(blocks),
        streamOffset: newOffset,
      })
      .where(eq(messages.id, messageId));
  }

  /**
   * Mark streaming message as complete
   */
  async markComplete(messageId: string): Promise<void> {
    const db = getDatabase();
    await db.update(messages)
      .set({ status: 'complete' })
      .where(eq(messages.id, messageId));
  }

  private toEntity(row: MessageRow | any): Message {
    const blocks: Block[] = row.blocks ? JSON.parse(row.blocks) : [];
    const toolInput = row.toolInput ? JSON.parse(row.toolInput) : null;

    // Handle both camelCase (from ORM) and snake_case (from raw SQL)
    const sessionId = row.sessionId || row.session_id;

    return new Message(
      row.id,
      sessionId,
      row.role as MessageRole,
      blocks,
      new Date(row.timestamp!),
      row.tokenCount ?? row.token_count ?? null,
      row.toolName ?? row.tool_name ?? null,
      toolInput,
      row.toolResult ?? row.tool_result ?? null,
      row.approvalId ?? row.approval_id ?? null,
      (row.status as 'streaming' | 'complete') ?? 'complete',
      row.streamOffset ?? row.stream_offset ?? 0
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
      status: message.status,
      streamOffset: message.streamOffset,
    };
  }
}
