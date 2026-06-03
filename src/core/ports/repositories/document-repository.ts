import type { Document, DocumentStatus } from "@core/domain/document";

export interface StatusPatch {
  status: DocumentStatus;
  chunkCount?: number;
  tokenCount?: number;
  error?: string;
  progress?: { phase: string; done: number; total: number };
}

export interface DocumentRepository {
  create(doc: Document): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  listByBot(botId: string): Promise<Document[]>;
  updateStatus(id: string, patch: StatusPatch): Promise<void>;
  delete(id: string): Promise<void>;
}
