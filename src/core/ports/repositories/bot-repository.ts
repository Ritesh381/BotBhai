import type { Bot, BotEditableFields } from "@core/domain/bot";

export interface BotRepository {
  create(bot: Bot): Promise<Bot>;
  findById(botId: string): Promise<Bot | null>;
  findByOwner(ownerId: string): Promise<Bot[]>;
  update(botId: string, patch: Partial<BotEditableFields>): Promise<Bot>;
  delete(botId: string): Promise<void>;
}
