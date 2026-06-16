import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { Bot, BotEditableFields } from "@core/domain/bot";

const COLLECTION = "v2_bots";

export class FirestoreBotRepository implements BotRepository {
  constructor(private readonly db: Firestore) {}

  async create(bot: Bot): Promise<Bot> {
    await this.db.collection(COLLECTION).doc(bot.id).set(bot);
    return bot;
  }

  async findById(botId: string): Promise<Bot | null> {
    const snap = await this.db.collection(COLLECTION).doc(botId).get();
    return snap.exists ? (snap.data() as Bot) : null;
  }

  async findByOwner(ownerId: string): Promise<Bot[]> {
    // Sort in memory to avoid requiring a composite (ownerId, updatedAt) index.
    const snap = await this.db
      .collection(COLLECTION)
      .where("ownerId", "==", ownerId)
      .get();
    return snap.docs
      .map((d) => d.data() as Bot)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async update(botId: string, patch: Partial<BotEditableFields>): Promise<Bot> {
    const ref = this.db.collection(COLLECTION).doc(botId);
    await ref.set({ ...patch, updatedAt: Date.now() }, { merge: true });
    return (await ref.get()).data() as Bot;
  }

  async delete(botId: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(botId).delete();
  }
}
