export type DocumentStatus = "queued" | "processing" | "staging" | "ready" | "error" | "stale";
export type SourceKind = "upload" | "paste" | "url" | "crawl" | "connector";
export type SupportedFileType = "pdf" | "txt" | "md" | "csv" | "docx" | "pptx";

export interface Document {
  id: string;
  botId: string;
  ownerId: string;
  filename: string;
  fileType: SupportedFileType | "md";
  sizeBytes: number;
  chunkCount: number;
  tokenCount?: number;
  status: DocumentStatus;
  source: SourceKind;
  sourceUrl?: string;
  crawlId?: string;
  error?: string;
  progress?: { phase: string; done: number; total: number };
  uploadedAt: number;
}

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = ["pdf", "txt", "md", "csv", "docx", "pptx"];

export function getSupportedType(filename: string): SupportedFileType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_FILE_TYPES.includes(ext as SupportedFileType)
    ? (ext as SupportedFileType)
    : null;
}
