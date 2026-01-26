/**
 * OpenAI Embedding Adapter
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 */

import { IEmbeddingGateway } from '../../domain/ports/gateways/embedding.port.js';

export class OpenAIEmbeddingAdapter implements IEmbeddingGateway {
  private readonly MODEL = 'text-embedding-3-small';
  private readonly DIMENSIONS = 1536;

  constructor(private apiKey: string) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI batch embedding failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    // Sort by index to maintain order
    return data.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding);
  }

  getDimensions(): number {
    return this.DIMENSIONS;
  }

  getProvider(): string {
    return 'openai';
  }
}
