import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { EmbedKeyRepository } from "@core/ports/repositories/embed-key-repository";
import type { Bot } from "@core/domain/bot";
import {
  defaultPersona,
  defaultWidgetConfig,
  defaultRetrievalConfig,
  defaultModelConfig,
} from "@core/domain/bot";
import { generatePublicKey } from "@core/domain/embed-key";
import { ok } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";

export interface CreateBotInput {
  ownerId: string;
  name: string;
  model?: string;
}

export class CreateBot {
  constructor(
    private readonly bots: BotRepository,
    private readonly embedKeys: EmbedKeyRepository,
    private readonly newId: () => string
  ) {}

  async execute(input: CreateBotInput): Promise<Result<Bot>> {
    const now = Date.now();
    const bot: Bot = {
      id: this.newId(),
      ownerId: input.ownerId,
      name: input.name.trim().slice(0, 80) || "My Bot",
      persona: defaultPersona(),
      widgetConfig: defaultWidgetConfig(),
      retrievalConfig: defaultRetrievalConfig(),
      modelConfig: defaultModelConfig(input.model || "llama-3.1-8b-instant"),
      allowedOrigins: ["localhost"],
      createdAt: now,
      updatedAt: now,
    };
    await this.bots.create(bot);

    // Auto-provision an embed key
    const key = {
      id: this.newId(),
      botId: bot.id,
      publicKey: generatePublicKey(),
      createdAt: now,
      revoked: false,
    };
    await this.embedKeys.create(key);

    return ok(bot);
  }
}
