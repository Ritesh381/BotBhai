import "server-only";

import Groq from "groq-sdk";
import { config } from "@/lib/config";
import type { RetrievedChunk, ResponseTone } from "@/types";

let client: Groq | null = null;
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: config.groq.apiKey() });
  return client;
}

const TONE_GUIDE: Record<ResponseTone, string> = {
  professional: "Maintain a polished, professional, and concise tone.",
  friendly: "Use a warm, approachable, and friendly tone.",
  humorous: "Keep the tone light and add tasteful, gentle humor where it fits.",
};

// Sentinel the model is instructed to emit when context is insufficient.
const NO_ANSWER = "NO_ANSWER";

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[Source ${i + 1} — ${c.filename}]\n${c.text}`
    )
    .join("\n\n---\n\n");
}

export interface GenerateArgs {
  botName: string;
  systemInstructions: string;
  tone: ResponseTone;
  question: string;
  chunks: RetrievedChunk[];
}

export interface GenerateResult {
  answer: string;
  confident: boolean;
}

export async function generateAnswer({
  botName,
  systemInstructions,
  tone,
  question,
  chunks,
}: GenerateArgs): Promise<GenerateResult> {
  const context = buildContext(chunks);

  const system = [
    `You are ${botName}, a helpful assistant that answers strictly from the provided context.`,
    systemInstructions?.trim() || "",
    TONE_GUIDE[tone],
    `Rules:`,
    `- Answer ONLY using the context below. Do not use outside knowledge.`,
    `- If the context does not contain the answer, reply with exactly "${NO_ANSWER}" and nothing else.`,
    `- Be accurate and do not invent facts, names, numbers, or sources.`,
    ``,
    `Context:`,
    context || "(no context available)",
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await getClient().chat.completions.create({
    model: config.groq.model,
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "";
  const confident = raw.length > 0 && raw.toUpperCase() !== NO_ANSWER;

  return {
    answer: confident
      ? raw
      : "I'm sorry, I don't have enough information in my knowledge base to answer that yet.",
    confident,
  };
}
