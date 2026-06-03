import type { EmbeddingProvider } from "@core/ports/embedding-provider";
import type { VectorWriter, VectorRecord } from "@core/ports/vector-store";
import type { ChunkingStrategy, ChunkingConfig } from "@core/ports/chunking-strategy";
import type { DocumentRepository } from "@core/ports/repositories/document-repository";
import type { ChunkMetadata } from "@core/domain/chunk";

export interface IngestTextInput {
  botId: string;
  ownerId: string;
  documentId: string;
  filename: string;
  text: string;
  sourceUrl?: string;
}

export class IngestText {
  constructor(
    private readonly embedder: EmbeddingProvider,
    private readonly vectors: VectorWriter,
    private readonly chunker: ChunkingStrategy,
    private readonly docs: DocumentRepository,
    private readonly chunkingConfig: ChunkingConfig
  ) {}

  async execute(input: IngestTextInput): Promise<{ chunkCount: number }> {
    await this.docs.updateStatus(input.documentId, { status: "processing" });

    const chunks = await this.chunker.chunk(
      { text: input.text, sourceKind: "paste" },
      this.chunkingConfig
    );

    if (chunks.length === 0) {
      await this.docs.updateStatus(input.documentId, {
        status: "error",
        error: "No extractable text found.",
      });
      return { chunkCount: 0 };
    }

    const embeddings = await this.embedder.embedPassages(chunks.map((c) => c.text));

    const records: VectorRecord[] = chunks.map((chunk, i) => {
      const metadata: ChunkMetadata = {
        documentId: input.documentId,
        botId: input.botId,
        ownerId: input.ownerId,
        filename: input.filename,
        chunkIndex: chunk.index,
        text: chunk.text,
        ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
      };
      return { id: `${input.documentId}::${i}`, values: embeddings[i], metadata };
    });

    await this.vectors.upsert(input.botId, records);
    await this.docs.updateStatus(input.documentId, {
      status: "ready",
      chunkCount: chunks.length,
    });

    return { chunkCount: chunks.length };
  }
}
