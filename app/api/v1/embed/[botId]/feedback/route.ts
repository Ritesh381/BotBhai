import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/src/composition/container";
import { loadConfig } from "@/src/composition/config";
import { getDb } from "@/src/adapters/persistence/firestore/firestore-client";
import { FirestoreBotRepository } from "@/src/adapters/persistence/firestore/firestore-bot-repository";
import { FirestoreEmbedKeyRepository } from "@/src/adapters/persistence/firestore/firestore-embed-key-repository";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const bots = new FirestoreBotRepository(db);
  const embedKeys = new FirestoreEmbedKeyRepository(db);

  const bot = await bots.findById(botId);
  if (!bot) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const publicKey = body.key || req.headers.get("x-embed-key") || "";
  const keyRecord = await embedKeys.findByPublicKey(publicKey);
  if (!keyRecord || keyRecord.botId !== botId) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const result = await getContainer().submitFeedback().execute({
    botId,
    conversationId: body.conversationId || "widget",
    messageId: body.messageId || "unknown",
    question: String(body.question || ""),
    answer: String(body.answer || ""),
    rating: body.rating === "up" ? "up" : "down",
    comment: body.comment,
  });

  return NextResponse.json(result.ok ? { ok: true } : { error: result.error });
}
