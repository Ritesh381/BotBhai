import type { Feedback } from "@core/domain/feedback";

export interface FeedbackRepository {
  record(f: Feedback): Promise<Feedback>;
  listLowRatedByBot(botId: string, limit?: number): Promise<Feedback[]>;
  findById(id: string): Promise<Feedback | null>;
  resolve(id: string): Promise<void>;
}
