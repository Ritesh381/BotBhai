export type FeedbackRating = "up" | "down";

export interface Feedback {
  id: string;
  botId: string;
  conversationId: string;
  messageId: string;
  question: string;
  answer: string;
  rating: FeedbackRating;
  comment?: string;
  resolved?: boolean;
  createdAt: number;
}
