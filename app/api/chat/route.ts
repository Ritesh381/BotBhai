import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getBot } from "@/lib/db/bots";
import { embedQuery } from "@/lib/vector/embeddings";
import { queryChunks } from "@/lib/vector/pinecone";
import { generateAnswer } from "@/lib/ai/groq";
import { recordMissing } from "@/lib/db/missing";
import type { ChatResponse, ChatSource } from "@/types";

export const runtime = "nodejs";

// POST /api/chat — public chat endpoint used by the test sandbox and the
// embeddable widget. Body: { botId, question }.
export async function POST(req: NextRequest) {
  let body: { botId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const botId = body.botId?.trim();
  const question = body.question?.trim();
  if (!botId || !question) {
    return NextResponse.json(
      { error: "botId and question are required" },
      { status: 400 }
    );
  }

  const bot = await getBot(botId);
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  // Retrieve relevant chunks.
  const queryVector = await embedQuery(question);
  const chunks = await queryChunks(botId, queryVector, config.retrieval.topK);

  const bestScore = chunks[0]?.score ?? 0;
  const hasContext = chunks.length > 0 && bestScore >= config.retrieval.minScore;

  // Generate the answer (the model also self-reports if context was enough).
  const { answer, confident } = await generateAnswer({
    botName: bot.name,
    systemInstructions: bot.systemInstructions,
    tone: bot.tone,
    question,
    chunks: hasContext ? chunks : [],
  });

  const answered = hasContext && confident;

  // Log low-confidence / unanswerable questions for the feedback loop.
  if (!answered) {
    await recordMissing(botId, question);
  }

  const sources: ChatSource[] = answered
    ? chunks.slice(0, 3).map((c) => ({
        filename: c.filename,
        snippet: c.text.slice(0, 220),
        score: Number(c.score.toFixed(3)),
      }))
    : [];

  const response: ChatResponse = { answer, sources, confident: answered };
  return NextResponse.json(response);
}
