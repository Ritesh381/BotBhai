import type { EmbedKey } from "@core/domain/embed-key";

export interface EmbedKeyRepository {
  create(key: EmbedKey): Promise<EmbedKey>;
  findActiveByBot(botId: string): Promise<EmbedKey | null>;
  findByPublicKey(publicKey: string): Promise<EmbedKey | null>;
  revokeAll(botId: string): Promise<void>;
}
