import type { RetrievedChunk } from "@core/domain/chunk";

export interface Reranker {
  rerank(query: string, chunks: RetrievedChunk[], topN: number): Promise<RetrievedChunk[]>;
}
