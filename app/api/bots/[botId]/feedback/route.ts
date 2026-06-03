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
