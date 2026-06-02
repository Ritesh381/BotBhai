import "server-only";

import { extractText, type SupportedType } from "@/lib/chunking/parse";
import { chunkText } from "@/lib/chunking/splitter";
import { embedPassages } from "@/lib/vector/embeddings";
import { upsertChunks, type UpsertVector } from "@/lib/vector/pinecone";
import { updateDocument, Status } from "@/lib/db/documents";
import type { ChunkMetadata } from "@/types";

export interface IngestArgs {
  buffer: Buffer;
  fileType: SupportedType;
  documentId: string;
  botId: string;
  userId: string;
  filename: string;
}

export interface IngestResult {
  chunkCount: number;
}

// Full pipeline for one uploaded document: extract → chunk → embed → upsert.
// Updates the document's Firestore status to ready/error when done.
export async function ingestDocument(args: IngestArgs): Promise<IngestResult> {
  const { buffer, fileType, documentId, botId, userId, filename } = args;

  try {
    const text = await extractText(buffer, fileType);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await updateDocument(documentId, {
        status: Status.ERROR,
        error: "No extractable text found in file.",
        chunkCount: 0,
      });
      return { chunkCount: 0 };
    }

    const embeddings = await embedPassages(chunks);

    const vectors: UpsertVector[] = chunks.map((chunkTextValue, i) => {
      const metadata: ChunkMetadata = {
        documentId,
        botId,
        userId,
        filename,
        chunkIndex: i,
        text: chunkTextValue,
      };
      return {
        id: `${documentId}::${i}`,
        values: embeddings[i],
        metadata,
      };
    });

    await upsertChunks(botId, vectors);

    await updateDocument(documentId, {
      status: Status.READY,
      chunkCount: chunks.length,
    });

    return { chunkCount: chunks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    await updateDocument(documentId, { status: Status.ERROR, error: message });
    throw err;
  }
}
