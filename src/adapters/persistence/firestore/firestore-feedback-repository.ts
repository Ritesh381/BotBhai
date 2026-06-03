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
    const snap = await this.db
      .collection(COLLECTION)
      .where("botId", "==", botId)
      .where("rating", "==", "down")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as Feedback);
  }
}
