import type { RetrievedChunk, ChunkMetadata } from "@core/domain/chunk";

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: ChunkMetadata;
}

export interface MetadataFilter {
  [key: string]: string | number | boolean;
}

export interface VectorReader {
  query(ns: string, vector: number[], topK: number, filter?: MetadataFilter): Promise<RetrievedChunk[]>;
}

export interface VectorWriter {
  upsert(ns: string, records: VectorRecord[]): Promise<void>;
  deleteByDocument(ns: string, documentId: string): Promise<void>;
  deleteNamespace(ns: string): Promise<void>;
}

export interface VectorStore extends VectorReader, VectorWriter {}
