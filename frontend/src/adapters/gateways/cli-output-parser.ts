import type { CliBlock } from './cli-adapter.interface';

export class CliOutputParser {
  private buffer = '';

  parse(chunk: string): CliBlock[] {
    this.buffer += chunk;
    const blocks: CliBlock[] = [];
    const lines = this.buffer.split('\n');

    // Keep last incomplete line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        blocks.push(this.normalizeBlock(parsed));
      } catch {
        // Not valid JSON, treat as text
        blocks.push({ type: 'text', content: trimmed });
      }
    }

    return blocks;
  }

  private normalizeBlock(raw: Record<string, unknown>): CliBlock {
    const type = this.normalizeType(raw.type as string);

    return {
      type,
      content: raw.content as string | undefined,
      language: raw.language as string | undefined,
      name: raw.name as string | undefined,
      input: raw.input as Record<string, unknown> | undefined,
    };
  }

  private normalizeType(type: string): CliBlock['type'] {
    switch (type) {
      case 'text':
      case 'code':
      case 'tool_use':
      case 'thinking':
      case 'error':
        return type;
      default:
        return 'text';
    }
  }

  reset(): void {
    this.buffer = '';
  }
}
