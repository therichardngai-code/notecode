/**
 * Embedding Gateway Port
 * Interface for text-to-vector embedding providers
 */

export interface IEmbeddingGateway {
  /** Generate embedding for single text */
  embed(text: string): Promise<number[]>;

  /** Generate embeddings for multiple texts */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** Get embedding dimensions for this provider */
  getDimensions(): number;

  /** Get provider name */
  getProvider(): string;
}
