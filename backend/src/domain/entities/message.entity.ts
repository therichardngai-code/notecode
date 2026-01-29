/**
 * Message Entity
 * Represents a chat message within a session
 */

import { Block, MessageRole } from '../value-objects/block-types.vo.js';

export type MessageStatus = 'streaming' | 'complete';

export class Message {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly role: MessageRole,
    public blocks: Block[], // Mutable for streaming append
    public readonly timestamp: Date,
    public tokenCount: number | null,
    public toolName: string | null,
    public toolInput: Record<string, unknown> | null,
    public toolResult: string | null,
    public approvalId: string | null = null, // Link to approval if tool required approval
    public status: MessageStatus = 'complete', // Streaming support
    public streamOffset: number = 0 // Current content length for delta sync
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

  /**
   * Create a streaming assistant message (status='streaming')
   * Content will be appended via appendContent()
   */
  static createStreamingMessage(
    id: string,
    sessionId: string,
    initialContent: string = ''
  ): Message {
    return new Message(
      id,
      sessionId,
      'assistant',
      [{ type: 'text', content: initialContent }],
      new Date(),
      null,
      null,
      null,
      null,
      null,
      'streaming',
      initialContent.length
    );
  }

  /**
   * Append content to streaming message
   * Returns the delta text that was appended
   */
  appendContent(delta: string): void {
    if (this.status !== 'streaming') return;

    // Find or create text block
    const textBlock = this.blocks.find(b => b.type === 'text') as { type: 'text'; content: string } | undefined;
    if (textBlock) {
      textBlock.content += delta;
    } else {
      this.blocks.push({ type: 'text', content: delta });
    }
    this.streamOffset += delta.length;
  }

  /**
   * Mark streaming message as complete
   */
  markComplete(): void {
    this.status = 'complete';
  }

  isStreaming(): boolean {
    return this.status === 'streaming';
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
