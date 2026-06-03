import type { DocumentParser } from "@core/ports/document-parser";
import type { EmbeddingProvider } from "@core/ports/embedding-provider";
import type { VectorWriter, VectorRecord } from "@core/ports/vector-store";
import type { ChunkingStrategy, ChunkingConfig } from "@core/ports/chunking-strategy";
import type { DocumentRepository } from "@core/ports/repositories/document-repository";
import type { ChunkMetadata } from "@core/domain/chunk";
import type { JobPayloadMap } from "@core/ports/job-queue";

export class RunIngestJob {
  constructor(
    private readonly parser: DocumentParser,
    private readonly embedder: EmbeddingProvider,
    private readonly vectors: VectorWriter,
    private readonly chunker: ChunkingStrategy,
    private readonly docs: DocumentRepository,
    private readonly chunkingConfig: ChunkingConfig
  ) {}

  async execute(payload: JobPayloadMap["ingest-document"]): Promise<void> {
    const { botId, ownerId, documentId, fileType, filename, text: pastedText } = payload;

    await this.docs.updateStatus(documentId, { status: "processing" });

    try {
      let text = pastedText ?? "";

      // If no text was passed, we need a real file buffer. In the InMemoryJobQueue
      // this is always a paste (the API route passes the text directly). For file
      // uploads via the API, the buffer was extracted in the route before enqueueing.
      if (!text) {
        await this.docs.updateStatus(documentId, {
          status: "error",
          error: "No content to ingest (missing text payload).",
        });
        return;
      }

      const chunks = await this.chunker.chunk(
        { text, sourceKind: "upload" },
        this.chunkingConfig
      );

      if (chunks.length === 0) {
        await this.docs.updateStatus(documentId, {
          status: "error",
          error: "No extractable text found.",
        });
        return;
      }

      const embeddings = await this.embedder.embedPassages(chunks.map((c) => c.text));

      const records: VectorRecord[] = chunks.map((chunk, i) => {
        const metadata: ChunkMetadata = {
          documentId,
          botId,
          ownerId,
          filename,
          chunkIndex: chunk.index,
          text: chunk.text,
        };
        return { id: `${documentId}::${i}`, values: embeddings[i], metadata };
      });

      await this.vectors.upsert(botId, records);
      await this.docs.updateStatus(documentId, {
        status: "ready",
        chunkCount: chunks.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ingestion failed";
      await this.docs.updateStatus(documentId, { status: "error", error: message });
      throw err;
    }
  }
}
