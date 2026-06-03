import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { MissingAnswerRepository } from "@core/ports/repositories/missing-answer-repository";
import type { DocumentRepository } from "@core/ports/repositories/document-repository";
import type { IngestText } from "@core/usecases/ingest/ingest-text";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { NotFoundError, ValidationError } from "@core/domain/errors";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";
import type { Document } from "@core/domain/document";

export class AddDataFromMissing {
  constructor(
    private readonly bots: BotRepository,
    private readonly missing: MissingAnswerRepository,
    private readonly docs: DocumentRepository,
    private readonly ingestText: IngestText,
    private readonly newId: () => string
  ) {}

  async execute(
    ownerId: string,
    botId: string,
    entryId: string,
    answer: string
  ): Promise<Result<{ documentId: string }, DomainError>> {
    try {
      if (!answer.trim()) throw new ValidationError("answer is required");
      await assertOwnsBot(this.bots, botId, ownerId);
      const entry = await this.missing.findById(entryId);
      if (!entry || entry.botId !== botId) throw new NotFoundError("missing-entry", entryId);

      const filename = "Manual entry (from missing answers)";
      const now = Date.now();
      const doc: Document = {
        id: this.newId(),
        botId,
        ownerId,
        filename,
        fileType: "md",
        sizeBytes: answer.length,
        chunkCount: 0,
        status: "queued",
        source: "paste",
        uploadedAt: now,
      };
      await this.docs.create(doc);

      await this.ingestText.execute({ botId, ownerId, documentId: doc.id, filename, text: answer });
      await this.missing.resolve(entryId);

      return ok({ documentId: doc.id });
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
