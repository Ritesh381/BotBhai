import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { Bot, BotEditableFields } from "@core/domain/bot";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export class UpdateBot {
  constructor(private readonly bots: BotRepository) {}

  async execute(
    ownerId: string,
    botId: string,
    patch: Partial<BotEditableFields>
  ): Promise<Result<Bot, DomainError>> {
    try {
      await assertOwnsBot(this.bots, botId, ownerId);
      const updated = await this.bots.update(botId, patch);
      return ok(updated);
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
