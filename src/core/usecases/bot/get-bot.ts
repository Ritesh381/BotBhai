import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { Bot } from "@core/domain/bot";
import { assertOwnsBot } from "@core/usecases/shared/authz";
import { ok, err } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export class GetBot {
  constructor(private readonly bots: BotRepository) {}

  async execute(ownerId: string, botId: string): Promise<Result<Bot, DomainError>> {
    try {
      const bot = await assertOwnsBot(this.bots, botId, ownerId);
      return ok(bot);
    } catch (e) {
      return err(e as DomainError);
    }
  }
}
