import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { MissingAnswerRepository } from "@core/ports/repositories/missing-answer-repository";
import type { MissingEntry, MissingStatus } from "@core/domain/missing-entry";
import { v4 as uuid } from "uuid";

const COLLECTION = "v2_missing_entries";
const TTL_90_DAYS = 90 * 24 * 60 * 60 * 1000;

export class FirestoreMissingAnswerRepository implements MissingAnswerRepository {
  constructor(private readonly db: Firestore) {}

  async upsertOccurrence(
    botId: string,
    question: string,
    normalized: string,
    now: number
  ): Promise<void> {
    const col = this.db.collection(COLLECTION);
    const existing = await col
      .where("botId", "==", botId)
      .where("normalizedQuestion", "==", normalized)
      .limit(1)
      .get();

    if (!existing.empty) {
      await existing.docs[0].ref.update({
        timesAsked: FieldValue.increment(1),
        lastSeen: now,
      });
      return;
    }

    const ref = col.doc(uuid());
    const entry: MissingEntry = {
      id: ref.id,
      botId,
      question: question.trim(),
      normalizedQuestion: normalized,
      timesAsked: 1,
      status: "open",
      firstSeen: now,
      lastSeen: now,
    };
    await ref.set({ ...entry, expireAt: new Date(now + TTL_90_DAYS) });
  }

  async listByBot(botId: string, status: MissingStatus): Promise<MissingEntry[]> {
    const snap = await this.db
      .collection(COLLECTION)
      .where("botId", "==", botId)
      .where("status", "==", status)
      .orderBy("timesAsked", "desc")
      .get();
    return snap.docs.map((d) => d.data() as MissingEntry);
  }

  async findById(id: string): Promise<MissingEntry | null> {
    const snap = await this.db.collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as MissingEntry) : null;
  }

  async resolve(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).update({ status: "resolved" });
  }
}
