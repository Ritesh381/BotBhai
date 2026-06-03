import type { Reranker } from "@core/ports/reranker";
import type { RetrievedChunk } from "@core/domain/chunk";

// Identity reranker — returns the top-N chunks by their existing score (v1 behavior).
// Replaced by a real cross-encoder reranker in M2.
export class NoopReranker implements Reranker {
  async rerank(
    _query: string,
    chunks: RetrievedChunk[],
    topN: number
  ): Promise<RetrievedChunk[]> {
    return chunks.slice(0, topN);
  }
}
