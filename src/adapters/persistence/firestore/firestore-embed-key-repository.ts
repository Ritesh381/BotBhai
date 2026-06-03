import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { EmbedKeyRepository } from "@core/ports/repositories/embed-key-repository";
import type { EmbedKey } from "@core/domain/embed-key";

const COLLECTION = "v2_embed_keys";

export class FirestoreEmbedKeyRepository implements EmbedKeyRepository {
  constructor(private readonly db: Firestore) {}

  async create(key: EmbedKey): Promise<EmbedKey> {
    await this.db.collection(COLLECTION).doc(key.id).set(key);
    return key;
  }

  async findActiveByBot(botId: string): Promise<EmbedKey | null> {
    const snap = await this.db
      .collection(COLLECTION)
      .where("botId", "==", botId)
      .where("revoked", "==", false)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as EmbedKey);
  }

  async findByPublicKey(publicKey: string): Promise<EmbedKey | null> {
    const snap = await this.db
      .collection(COLLECTION)
      .where("publicKey", "==", publicKey)
      .where("revoked", "==", false)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as EmbedKey);
  }

  async revokeAll(botId: string): Promise<void> {
    const snap = await this.db
      .collection(COLLECTION)
      .where("botId", "==", botId)
      .where("revoked", "==", false)
      .get();
    const batch = this.db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { revoked: true, rotatedAt: Date.now() }));
    await batch.commit();
  }
}
