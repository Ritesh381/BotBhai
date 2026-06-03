import type { BotRepository } from "@core/ports/repositories/bot-repository";
import type { EmbeddingProvider } from "@core/ports/embedding-provider";
import type { VectorReader } from "@core/ports/vector-store";
import type { Reranker } from "@core/ports/reranker";
import type { LLMProvider } from "@core/ports/llm-provider";
import type { MissingAnswerRepository } from "@core/ports/repositories/missing-answer-repository";
import type { ChatSource, RetrievedChunk } from "@core/domain/chunk";
import { evaluateConfidence, normalizeQuestion } from "@core/domain/missing-entry";
import { NotFoundError } from "@core/domain/errors";

const NO_ANSWER = "NO_ANSWER";

export interface AnswerInput {
  botId: string;
  question: string;
}

export interface AnswerOutput {
  answer: string;
  sources: ChatSource[];
  confident: boolean;
}

interface GlobalRetrieval {
  topK: number;
  finalK: number;
  minScore: number;
}

export class AnswerQuestion {
  constructor(
    private readonly bots: BotRepository,
    private readonly embedder: EmbeddingProvider,
    private readonly vectors: VectorReader,
    private readonly reranker: Reranker,
    private readonly llm: LLMProvider,
    private readonly missing: MissingAnswerRepository,
    private readonly defaults: GlobalRetrieval
  ) {}

  async *stream(input: AnswerInput): AsyncGenerator<
    | { type: "token"; data: string }
    | { type: "sources"; data: ChatSource[] }
    | { type: "done"; confident: boolean }
  > {
    const bot = await this.bots.findById(input.botId);
    if (!bot) throw new NotFoundError("bot", input.botId);

    const rc = bot.retrievalConfig;
    const topK = rc.topK ?? this.defaults.topK;
    const finalK = rc.finalK ?? this.defaults.finalK;
    const minScore = rc.minScore ?? this.defaults.minScore;

    const queryVec = await this.embedder.embedQuery(input.question);
    const candidates = await this.vectors.query(input.botId, queryVec, topK);
    const reranked = await this.reranker.rerank(input.question, candidates, finalK);
    const bestScore = reranked[0]?.score ?? 0;

    const system = this.buildSystem(bot, reranked);
    let answer = "";
    let confident = false;

    const stream = this.llm.stream({
      model: bot.modelConfig.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input.question },
      ],
      temperature: bot.modelConfig.temperature,
      maxTokens: bot.modelConfig.maxTokens,
    });

    for await (const delta of stream) {
      answer += delta;
      yield { type: "token", data: delta };
    }

    confident = evaluateConfidence(bestScore, minScore, answer.trim().toUpperCase() === NO_ANSWER);

    if (!confident) {
      // Return persona fallback instead of the NO_ANSWER sentinel
      const fallback = bot.persona.fallback;
      yield { type: "token", data: fallback };
      answer = fallback;
      // Log as missing
      const normalized = normalizeQuestion(input.question);
      if (normalized) {
        await this.missing.upsertOccurrence(
          input.botId,
          input.question,
          normalized,
          Date.now()
        );
      }
    }

    const sources: ChatSource[] = confident
      ? reranked.slice(0, 3).map((c: RetrievedChunk) => ({
          filename: c.filename,
          snippet: c.text.slice(0, 220),
          score: Number(c.score.toFixed(3)),
          sourceUrl: c.sourceUrl,
        }))
      : [];

    yield { type: "sources", data: sources };
    yield { type: "done", confident };
  }

  private buildSystem(bot: { name: string; persona: { systemInstructions: string; tone: string } }, chunks: RetrievedChunk[]): string {
    const toneGuide: Record<string, string> = {
      professional: "Maintain a polished, professional, and concise tone.",
      friendly: "Use a warm, approachable, and friendly tone.",
      humorous: "Keep the tone light and add tasteful, gentle humor where it fits.",
    };
    const context = chunks
      .map((c, i) => `[Source ${i + 1} — ${c.filename}]\n${c.text}`)
      .join("\n\n---\n\n");

    return [
      `You are ${bot.name}, a helpful assistant that answers strictly from the provided context.`,
      bot.persona.systemInstructions,
      toneGuide[bot.persona.tone] ?? toneGuide.professional,
      `Rules:`,
      `- Answer ONLY from the context below. Do not use outside knowledge.`,
      `- If context is insufficient, reply with exactly "${NO_ANSWER}" and nothing else.`,
      ``,
      `Context:`,
      context || "(no context available)",
    ].filter(Boolean).join("\n");
  }
}
