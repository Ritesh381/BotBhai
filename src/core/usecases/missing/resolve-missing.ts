import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { MissingAnswerRepository } from "@core/ports/repositories/missing-answer-repository";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { NotFoundError } from "@core/domain/errors";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export class ResolveMissing {
  constructor(
    private readonly bots: BotRepository,
    private readonly missing: MissingAnswerRepository
  ) {}

  async execute(
    ownerId: string,
    botId: string,
    entryId: string
  ): Promise<Result<void, DomainError>> {
    try {
      await assertOwnsBot(this.bots, botId, ownerId);
      const entry = await this.missing.findById(entryId);
      if (!entry || entry.botId !== botId) throw new NotFoundError("missing-entry", entryId);
      await this.missing.resolve(entryId);
      return ok(undefined);
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
