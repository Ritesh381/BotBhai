import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebase/auth-server";
import { getOrCreateBot, updateBot } from "@/lib/db/bots";
import type { ResponseTone } from "@/types";

export const runtime = "nodejs";

const TONES: ResponseTone[] = ["professional", "friendly", "humorous"];

// GET /api/bot — fetch (or lazily create) the signed-in user's bot config.
export async function GET(req: NextRequest) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bot = await getOrCreateBot(user.uid, user.email);
  return NextResponse.json({ bot });
}

// PATCH /api/bot — update name / instructions / tone.
export async function PATCH(req: NextRequest) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await getOrCreateBot(user.uid, user.email);
  const body = await req.json();

  const patch: { name?: string; systemInstructions?: string; tone?: ResponseTone } = {};
  if (typeof body.name === "string") patch.name = body.name.slice(0, 80);
  if (typeof body.systemInstructions === "string")
    patch.systemInstructions = body.systemInstructions.slice(0, 2000);
  if (TONES.includes(body.tone)) patch.tone = body.tone;

  const bot = await updateBot(user.uid, patch);
  return NextResponse.json({ bot });
}
