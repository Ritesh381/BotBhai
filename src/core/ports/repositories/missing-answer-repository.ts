import type { MissingEntry, MissingStatus } from "@core/domain/missing-entry";

export interface MissingAnswerRepository {
  upsertOccurrence(
    botId: string,
    question: string,
    normalized: string,
    now: number
  ): Promise<void>;
  listByBot(botId: string, status: MissingStatus): Promise<MissingEntry[]>;
  findById(id: string): Promise<MissingEntry | null>;
  resolve(id: string): Promise<void>;
}
