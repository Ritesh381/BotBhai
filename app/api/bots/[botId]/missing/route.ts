import { NextRequest } from "next/server";
import { getContainer } from "@/src/composition/container";
import { respond, unauthorized } from "@/src/lib/http/respond";
import type { MissingStatus } from "@/src/core/domain/missing-entry";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;
  const status = (req.nextUrl.searchParams.get("status") ?? "open") as MissingStatus;
  return respond(await c.listMissing().execute(user.uid, botId, status));
}
