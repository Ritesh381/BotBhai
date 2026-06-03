import "server-only";
import Groq from "groq-sdk";
import type { LLMProvider, CompletionRequest, TokenUsage } from "@core/ports/llm-provider";

const GROQ_COST_PER_TOKEN: Record<string, number> = {
  "llama-3.1-8b-instant": 0.00000005, // $0.05 / 1M tokens (rough)
};

export class GroqLLMProvider implements LLMProvider {
  private client: Groq;

  constructor(private readonly cfg: { apiKey: string; model: string }) {
    this.client = new Groq({ apiKey: cfg.apiKey });
  }

  async complete(req: CompletionRequest): Promise<{ text: string; usage: TokenUsage }> {
    const res = await this.client.chat.completions.create({
      model: req.model || this.cfg.model,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? 700,
      messages: req.messages,
      stream: false,
    });
    const text = res.choices[0]?.message?.content?.trim() ?? "";
    const promptTokens = res.usage?.prompt_tokens ?? 0;
    const completionTokens = res.usage?.completion_tokens ?? 0;
    const rate = GROQ_COST_PER_TOKEN[req.model || this.cfg.model] ?? 0;
    return {
      text,
      usage: {
        promptTokens,
        completionTokens,
        costUsd: (promptTokens + completionTokens) * rate,
      },
    };
  }

  async *stream(req: CompletionRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: req.model || this.cfg.model,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? 700,
      messages: req.messages,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
