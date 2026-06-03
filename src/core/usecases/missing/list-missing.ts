import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { MissingAnswerRepository } from "@core/ports/repositories/missing-answer-repository";
import type { MissingEntry, MissingStatus } from "@core/domain/missing-entry";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export class ListMissing {
  constructor(
    private readonly bots: BotRepository,
    private readonly missing: MissingAnswerRepository
  ) {}

  async execute(
    ownerId: string,
    botId: string,
    status: MissingStatus = "open"
  ): Promise<Result<MissingEntry[], DomainError>> {
    try {
      await assertOwnsBot(this.bots, botId, ownerId);
      const entries = await this.missing.listByBot(botId, status);
      return ok(entries);
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
