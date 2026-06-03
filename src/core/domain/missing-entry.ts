export type MissingStatus = "open" | "resolved";

export interface MissingEntry {
  id: string;
  botId: string;
  question: string;
  normalizedQuestion: string;
  timesAsked: number;
  status: MissingStatus;
  firstSeen: number;
  lastSeen: number;
}

export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateConfidence(
  bestScore: number,
  minScore: number,
  llmRefused: boolean
): boolean {
  return bestScore >= minScore && !llmRefused;
}
