export interface EmbeddingProvider {
  embedPassages(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  readonly dimensions: number;
}
