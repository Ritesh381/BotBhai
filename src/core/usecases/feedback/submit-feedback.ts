import type { FeedbackRepository } from "@core/ports/repositories/feedback-repository";
import type { Feedback, FeedbackRating } from "@core/domain/feedback";
import { ok } from "@core/usecases/shared/result";
import type { Result } from "@core/usecases/shared/result";

export interface SubmitFeedbackInput {
  botId: string;
  conversationId: string;
  messageId: string;
  question: string;
  answer: string;
  rating: FeedbackRating;
  comment?: string;
}

export class SubmitFeedback {
  constructor(
    private readonly feedback: FeedbackRepository,
    private readonly newId: () => string
  ) {}

  async execute(input: SubmitFeedbackInput): Promise<Result<Feedback>> {
    const f: Feedback = { ...input, id: this.newId(), resolved: false, createdAt: Date.now() };
    await this.feedback.record(f);
    return ok(f);
  }
}
