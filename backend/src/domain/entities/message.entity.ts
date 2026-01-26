/**
 * Message Entity
 * Represents a chat message within a session
 */

import { Block, MessageRole } from '../value-objects/block-types.vo.js';

export class Message {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly role: MessageRole,
    public readonly blocks: Block[],
    public readonly timestamp: Date,
    public tokenCount: number | null,
    public toolName: string | null,
    public toolInput: Record<string, unknown> | null,
    public toolResult: string | null,
    public approvalId: string | null = null // Link to approval if tool required approval
  ) {}

  static createUserMessage(
    id: string,
    sessionId: string,
    content: string
  ): Message {
    return new Message(
      id,
      sessionId,
      'user',
      [{ type: 'text', content }],
      new Date(),
      null,
      null,
      null,
      null
    );
  }

  static createAssistantMessage(
    id: string,
    sessionId: string,
    blocks: Block[],
    tokenCount?: number
  ): Message {
    return new Message(
      id,
      sessionId,
      'assistant',
      blocks,
      new Date(),
      tokenCount ?? null,
      null,
      null,
      null
    );
  }

  static createToolMessage(
    id: string,
    sessionId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolResult: string
  ): Message {
    return new Message(
      id,
      sessionId,
      'tool',
      [{ type: 'text', content: toolResult }],
      new Date(),
      null,
      toolName,
      toolInput,
      toolResult
    );
  }

  static createSystemMessage(
    id: string,
    sessionId: string,
    content: string
  ): Message {
    return new Message(
      id,
      sessionId,
      'system',
      [{ type: 'text', content }],
      new Date(),
      null,
      null,
      null,
      null
    );
  }

  hasToolUse(): boolean {
    return this.toolName !== null;
  }

  getTextContent(): string {
    return this.blocks
      .filter((b): b is { type: 'text'; content: string } => b.type === 'text')
      .map(b => b.content)
      .join('\n');
  }

  getCodeBlocks(): Array<{ language: string; content: string }> {
    return this.blocks
      .filter(
        (b): b is { type: 'code'; language: string; content: string } =>
          b.type === 'code'
      );
  }
}
