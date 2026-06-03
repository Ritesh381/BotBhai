export interface JobPayloadMap {
  "ingest-document": {
    botId: string;
    ownerId: string;
    documentId: string;
    fileType: string;
    filename: string;
    text?: string; // for paste/url sources
    storageKey?: string;
  };
  "cleanup-orphans": { botId: string };
}

export interface JobQueue {
  enqueue<K extends keyof JobPayloadMap>(
    kind: K,
    payload: JobPayloadMap[K]
  ): Promise<{ jobId: string }>;
}
