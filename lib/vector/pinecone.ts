import "server-only";

import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "@/lib/config";
import type { ChunkMetadata, RetrievedChunk } from "@/types";

let client: Pinecone | null = null;

function getClient(): Pinecone {
  if (!client) client = new Pinecone({ apiKey: config.pinecone.apiKey() });
  return client;
}

// Each bot gets its own Pinecone namespace for isolation.
function ns(botId: string) {
  return getClient().index(config.pinecone.indexName()).namespace(botId);
}

export interface UpsertVector {
  id: string;
  values: number[];
  metadata: ChunkMetadata;
}

export async function upsertChunks(
  botId: string,
  vectors: UpsertVector[]
): Promise<void> {
  if (vectors.length === 0) return;
  const index = ns(botId);
  const BATCH = 100;
  for (let i = 0; i < vectors.length; i += BATCH) {
    await index.upsert(vectors.slice(i, i + BATCH));
  }
}

export async function queryChunks(
  botId: string,
  vector: number[],
  topK: number
): Promise<RetrievedChunk[]> {
  const result = await ns(botId).query({
    vector,
    topK,
    includeMetadata: true,
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
    };
  });
}

// Delete every vector belonging to one document (used when a doc is removed).
export async function deleteDocumentVectors(
  botId: string,
  documentId: string
): Promise<void> {
  try {
    await ns(botId).deleteMany({ documentId: { $eq: documentId } });
  } catch (err) {
    // Metadata-filtered delete needs a serverless index; fall back to no-op
    // logging so a delete failure doesn't block removing Firestore metadata.
    console.error("Pinecone deleteMany failed:", err);
    throw err;
  }
}
