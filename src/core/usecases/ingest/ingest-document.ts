import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { DocumentRepository } from "@core/ports/repositories/document-repository";
import type { JobQueue } from "@core/ports/job-queue";
import type { Document } from "@core/domain/document";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export interface IngestDocumentInput {
  ownerId: string;
  botId: string;
  filename: string;
  fileType: string;
  sizeBytes: number;
  text?: string;       // for paste/url; if provided, skips file parse
}

export class IngestDocument {
  constructor(
    private readonly bots: BotRepository,
    private readonly docs: DocumentRepository,
    private readonly queue: JobQueue,
    private readonly newId: () => string
  ) {}

  async execute(
    input: IngestDocumentInput
  ): Promise<Result<{ documentId: string; status: "queued" }, DomainError>> {
    try {
      await assertOwnsBot(this.bots, input.botId, input.ownerId);

      const now = Date.now();
      const doc: Document = {
        id: this.newId(),
        botId: input.botId,
        ownerId: input.ownerId,
        filename: input.filename,
        fileType: input.fileType as Document["fileType"],
        sizeBytes: input.sizeBytes,
        chunkCount: 0,
        status: "queued",
        source: input.text ? "paste" : "upload",
        uploadedAt: now,
      };
      await this.docs.create(doc);

      await this.queue.enqueue("ingest-document", {
        botId: input.botId,
        ownerId: input.ownerId,
        documentId: doc.id,
        fileType: input.fileType,
        filename: input.filename,
        text: input.text,
      });

      return ok({ documentId: doc.id, status: "queued" });
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
