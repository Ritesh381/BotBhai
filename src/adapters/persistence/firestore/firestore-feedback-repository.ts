import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { FeedbackRepository } from "@core/ports/repositories/feedback-repository";
import type { Feedback } from "@core/domain/feedback";

const COLLECTION = "v2_feedback";

export class FirestoreFeedbackRepository implements FeedbackRepository {
  constructor(private readonly db: Firestore) {}

  async record(f: Feedback): Promise<Feedback> {
    await this.db.collection(COLLECTION).doc(f.id).set(f);
    return f;
  }

  async listLowRatedByBot(botId: string, limit = 50): Promise<Feedback[]> {
    // Sort + filter in memory to avoid requiring a composite index.
    const snap = await this.db
      .collection(COLLECTION)
      .where("botId", "==", botId)
      .where("rating", "==", "down")
      .get();
    return snap.docs
      .map((d) => d.data() as Feedback)
      .filter((f) => !f.resolved)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  async findById(id: string): Promise<Feedback | null> {
    const snap = await this.db.collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as Feedback) : null;
  }

  async resolve(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).update({ resolved: true });
  }
}
