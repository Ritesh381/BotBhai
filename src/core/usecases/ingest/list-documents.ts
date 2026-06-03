import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { DocumentRepository } from "@core/ports/repositories/document-repository";
import type { Document } from "@core/domain/document";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export class ListDocuments {
  constructor(
    private readonly bots: BotRepository,
    private readonly docs: DocumentRepository
  ) {}

  async execute(ownerId: string, botId: string): Promise<Result<Document[], DomainError>> {
    try {
      await assertOwnsBot(this.bots, botId, ownerId);
      const list = await this.docs.listByBot(botId);
      return ok(list);
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
