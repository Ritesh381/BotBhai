import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { Bot } from "@core/domain/bot";
import { NotFoundError } from "@core/domain/errors";

// Returns the bot if owned by ownerId; throws NotFoundError otherwise (prevents enumeration).
export async function assertOwnsBot(
  bots: BotRepository,
  botId: string,
  ownerId: string
): Promise<Bot> {
  const bot = await bots.findById(botId);
  if (!bot || bot.ownerId !== ownerId) throw new NotFoundError("bot", botId);
  return bot;
}
