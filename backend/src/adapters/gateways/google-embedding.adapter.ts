/**
 * Google Embedding Adapter
 * Uses Google's text-embedding-004 model (768 dimensions)
 */

import { IEmbeddingGateway } from '../../domain/ports/gateways/embedding.port.js';

export class GoogleEmbeddingAdapter implements IEmbeddingGateway {
  private readonly MODEL = 'text-embedding-004';
  private readonly DIMENSIONS = 768;

  constructor(private apiKey: string) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.MODEL}`,
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google embedding failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as { embedding: { values: number[] } };
    return data.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Google API supports batch via batchEmbedContents
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:batchEmbedContents?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: texts.map(text => ({
            model: `models/${this.MODEL}`,
            content: { parts: [{ text }] },
          })),
        }),
      }
    );

    if (!response.ok) {
      // Fallback to sequential if batch fails
      const results: number[][] = [];
      for (const text of texts) {
        results.push(await this.embed(text));
      }
      return results;
    }

    const data = await response.json() as { embeddings: Array<{ values: number[] }> };
    return data.embeddings.map(e => e.values);
  }

  getDimensions(): number {
    return this.DIMENSIONS;
  }

  getProvider(): string {
    return 'google';
  }
}
