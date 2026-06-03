import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/src/composition/config";
import { getDb } from "@/src/adapters/persistence/firestore/firestore-client";
import { FirestoreBotRepository } from "@/src/adapters/persistence/firestore/firestore-bot-repository";
import { FirestoreEmbedKeyRepository } from "@/src/adapters/persistence/firestore/firestore-embed-key-repository";
import { getContainer } from "@/src/composition/container";

export const runtime = "nodejs";

const MAX_QUESTION_LEN = 2000;

function corsHeaders(origin: string, allowedOrigins: string[]): Record<string, string> {
  const ok = allowedOrigins.some(
    (o) => o === "*" || o === origin || origin.includes("localhost")
  );
  if (!ok) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const origin = req.headers.get("origin") || "";

  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const bots = new FirestoreBotRepository(db);
  const embedKeys = new FirestoreEmbedKeyRepository(db);

  const bot = await bots.findById(botId);
  if (!bot) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });

  const ch = corsHeaders(origin, bot.allowedOrigins);
  if (!Object.keys(ch).length && origin) {
    return NextResponse.json({ error: { code: "forbidden_origin", message: "Origin not allowed" } }, { status: 403, headers: ch });
  }

  const body = await req.json().catch(() => ({}));
  const publicKey = body.key || req.headers.get("x-embed-key") || "";
  const keyRecord = await embedKeys.findByPublicKey(publicKey);
  if (!keyRecord || keyRecord.botId !== botId) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Invalid embed key" } }, { status: 401, headers: ch });
  }

  const question = String(body.question || "").trim();
  if (!question || question.length > MAX_QUESTION_LEN) {
    return NextResponse.json({ error: { code: "validation", message: "Invalid question" } }, { status: 400, headers: ch });
  }

  const answerer = getContainer().answerQuestion();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        for await (const chunk of answerer.stream({ botId, question })) {
          if (chunk.type === "token") send("token", { t: chunk.data });
          else if (chunk.type === "sources") send("sources", { sources: chunk.data });
          else if (chunk.type === "done") send("done", { confident: chunk.confident });
        }
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...ch,
    },
  });
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const origin = req.headers.get("origin") || "";
  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const bot = await new FirestoreBotRepository(db).findById(botId);
  const ch = bot ? corsHeaders(origin, bot.allowedOrigins) : {};
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...ch,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-embed-key",
    },
  });
}
