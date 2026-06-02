// ── Global domain types for BotBhai ──

export type ResponseTone = "professional" | "friendly" | "humorous";

export interface BotConfig {
  botId: string; // == userId for MVP (one bot per user)
  userId: string;
  name: string;
  systemInstructions: string;
  tone: ResponseTone;
  createdAt: number;
  updatedAt: number;
}

export type DocumentStatus = "processing" | "ready" | "error";

export interface DocumentMeta {
  id: string;
  userId: string;
  botId: string;
  filename: string;
  fileType: string; // pdf | txt | md | csv
  sizeBytes: number;
  chunkCount: number;
  status: DocumentStatus;
  error?: string;
  uploadedAt: number;
}

// A chunk's metadata as stored alongside its vector in Pinecone.
export interface ChunkMetadata {
  documentId: string;
  botId: string;
  userId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  [key: string]: string | number | boolean;
}

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  filename: string;
  documentId: string;
  chunkIndex: number;
}

export interface ChatSource {
  filename: string;
  snippet: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  confident: boolean;
}

export type MissingStatus = "open" | "resolved";

export interface MissingEntry {
  id: string;
  botId: string;
  question: string;
  normalizedQuestion: string;
  timesAsked: number;
  status: MissingStatus;
  firstSeen: number;
  lastSeen: number;
}
