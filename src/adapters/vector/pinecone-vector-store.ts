import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import type { VectorStore, VectorRecord, MetadataFilter } from "@core/ports/vector-store";
import type { RetrievedChunk, ChunkMetadata } from "@core/domain/chunk";

export class PineconeVectorStore implements VectorStore {
  private client: Pinecone;

  constructor(private readonly cfg: { apiKey: string; indexName: string }) {
    this.client = new Pinecone({ apiKey: cfg.apiKey });
  }

  private ns(namespace: string) {
    return this.client.index(this.cfg.indexName).namespace(namespace);
  }

  async upsert(ns: string, records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;
    const index = this.ns(ns);
    const BATCH = 100;
    for (let i = 0; i < records.length; i += BATCH) {
      // Cast to any to satisfy Pinecone's RecordMetadata constraint; our metadata
      // satisfies the shape at runtime (all values are string | number | boolean).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await index.upsert(records.slice(i, i + BATCH) as any);
    }
  }

  async query(
    ns: string,
    vector: number[],
    topK: number,
    filter?: MetadataFilter
  ): Promise<RetrievedChunk[]> {
    const result = await this.ns(ns).query({
      vector,
      topK,
      includeMetadata: true,
      ...(filter ? { filter } : {}),
    });
    return (result.matches || []).map((m) => {
      const md = (m.metadata || {}) as Partial<ChunkMetadata>;
      return {
        id: m.id,
        score: m.score ?? 0,
        text: String(md.text ?? ""),
        filename: String(md.filename ?? "unknown"),
        documentId: String(md.documentId ?? ""),
        chunkIndex: Number(md.chunkIndex ?? 0),
        sourceUrl: md.sourceUrl ? String(md.sourceUrl) : undefined,
      };
    });
  }

  async deleteByDocument(ns: string, documentId: string): Promise<void> {
    try {
      await this.ns(ns).deleteMany({ documentId: { $eq: documentId } } as unknown as string[]);
    } catch (err) {
      console.error("Pinecone deleteByDocument failed:", err);
      throw err;
    }
  }

  async deleteNamespace(ns: string): Promise<void> {
    try {
      await this.ns(ns).deleteAll();
    } catch (err) {
      console.error("Pinecone deleteNamespace failed:", err);
    }
  }
}
