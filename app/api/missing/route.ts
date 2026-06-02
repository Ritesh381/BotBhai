import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebase/auth-server";
import { getOrCreateBot } from "@/lib/db/bots";
import { listMissing } from "@/lib/db/missing";

export const runtime = "nodejs";

// GET /api/missing?status=open — list unanswered questions for the user's bot.
export async function GET(req: NextRequest) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bot = await getOrCreateBot(user.uid, user.email);
  const status =
    req.nextUrl.searchParams.get("status") === "resolved" ? "resolved" : "open";

  const entries = await listMissing(bot.botId, status);
  return NextResponse.json({ entries });
}
