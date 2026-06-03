import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { DocumentRepository } from "@core/ports/repositories/document-repository";
import type { EmbedKeyRepository } from "@core/ports/repositories/embed-key-repository";
import type { VectorWriter } from "@core/ports/vector-store";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export class DeleteBot {
  constructor(
    private readonly bots: BotRepository,
    private readonly docs: DocumentRepository,
    private readonly vectors: VectorWriter,
    private readonly embedKeys: EmbedKeyRepository
  ) {}

  async execute(ownerId: string, botId: string): Promise<Result<void, DomainError>> {
    try {
      await assertOwnsBot(this.bots, botId, ownerId);
      // Delete all vectors, embed keys, docs, then the bot
      await Promise.allSettled([
        this.vectors.deleteNamespace(botId),
        this.embedKeys.revokeAll(botId),
      ]);
      const docList = await this.docs.listByBot(botId);
      await Promise.all(docList.map((d) => this.docs.delete(d.id)));
      await this.bots.delete(botId);
      return ok(undefined);
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
