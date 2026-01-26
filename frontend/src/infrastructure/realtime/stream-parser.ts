export interface StreamChunk {
  type: string;
  data: unknown;
}

export class StreamParser {
  private buffer = '';

  parse(chunk: string): StreamChunk[] {
    this.buffer += chunk;
    const chunks: StreamChunk[] = [];

    // Split by newlines to get individual JSON objects
    const lines = this.buffer.split('\n');

    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        chunks.push({
          type: parsed.type || 'unknown',
          data: parsed,
        });
      } catch (error) {
        console.error('Failed to parse stream chunk:', error);
        // Add as raw text chunk
        chunks.push({
          type: 'text',
          data: { content: trimmed },
        });
      }
    }

    return chunks;
  }

  reset(): void {
    this.buffer = '';
  }

  getBuffer(): string {
    return this.buffer;
  }
}
