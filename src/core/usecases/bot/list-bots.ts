import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { Bot } from "@core/domain/bot";
import { ok } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";

export class ListBots {
  constructor(private readonly bots: BotRepository) {}

  async execute(ownerId: string): Promise<Result<Bot[]>> {
    const list = await this.bots.findByOwner(ownerId);
    return ok(list);
  }
}
