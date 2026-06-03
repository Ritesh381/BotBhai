export interface StructureHint {
  type: "heading" | "slide" | "row" | "qa";
  value: string;
  level?: number;
}

export interface Chunk {
  text: string;
  index: number;
  meta?: {
    heading?: string;
    slide?: number;
    rowId?: string;
    qa?: boolean;
  };
}

export interface ChunkMetadata {
  documentId: string;
  botId: string;
  ownerId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  sourceUrl?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  filename: string;
  documentId: string;
  chunkIndex: number;
  sourceUrl?: string;
}

export interface ChatSource {
  filename: string;
  snippet: string;
  score: number;
  sourceUrl?: string;
}
