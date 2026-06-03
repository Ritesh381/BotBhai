import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/src/composition/container";
import { respond, unauthorized } from "@/src/lib/http/respond";

export const runtime = "nodejs";

// GET /api/bots — list user's bots
export async function GET(req: NextRequest) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  return respond(await c.listBots().execute(user.uid));
}

// POST /api/bots — create a bot
export async function POST(req: NextRequest) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim() || `${user.email?.split("@")[0] ?? "My"}'s Bot`;

  return respond(await c.createBot().execute({ ownerId: user.uid, name }));
}
