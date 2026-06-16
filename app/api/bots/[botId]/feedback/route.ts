import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/src/composition/container";
import { unauthorized } from "@/src/lib/http/respond";
import { loadConfig } from "@/src/composition/config";
import { getDb } from "@/src/adapters/persistence/firestore/firestore-client";
import { FirestoreFeedbackRepository } from "@/src/adapters/persistence/firestore/firestore-feedback-repository";

export const runtime = "nodejs";

// GET /api/bots/[botId]/feedback — list low-rated answers for the owner
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;

  const owned = await c.getBot().execute(user.uid, botId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.error.httpStatus });
  }

  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const feedbackRepo = new FirestoreFeedbackRepository(db);
  const entries = await feedbackRepo.listLowRatedByBot(botId, 50);
  return NextResponse.json({ feedback: entries });
}

// POST /api/bots/[botId]/feedback
//   { action: "resolve", id }                      — dismiss a low-rated entry
//   { rating, question, answer, messageId, ... }   — submit feedback (test-chat playground)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;

  // Ownership check — only the bot owner may submit/resolve via this authed route.
  const owned = await c.getBot().execute(user.uid, botId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.error.httpStatus });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "resolve") {
    if (!body.id) return NextResponse.json({ error: { code: "validation", message: "id required" } }, { status: 400 });
    const cfg = loadConfig();
    const db = getDb(cfg.firebase.adminJson);
    const feedbackRepo = new FirestoreFeedbackRepository(db);
    const entry = await feedbackRepo.findById(String(body.id));
    if (!entry || entry.botId !== botId) {
      return NextResponse.json({ error: { code: "not_found", message: "Feedback not found" } }, { status: 404 });
    }
    await feedbackRepo.resolve(String(body.id));
    return NextResponse.json({ ok: true });
  }

  const result = await c.submitFeedback().execute({
    botId,
    conversationId: body.conversationId || "playground",
    messageId: body.messageId || "unknown",
    question: String(body.question || ""),
    answer: String(body.answer || ""),
    rating: body.rating === "up" ? "up" : "down",
    comment: body.comment,
  });
  return NextResponse.json(result.ok ? { ok: true } : { error: result.error });
}
