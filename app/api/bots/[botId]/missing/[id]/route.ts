import { NextRequest } from "next/server";
import { getContainer } from "@/src/composition/container";
import { respond, unauthorized, badRequest } from "@/src/lib/http/respond";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string; id: string }> }
) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId, id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "resolve") {
    return respond(await c.resolveMissing().execute(user.uid, botId, id));
  }

  if (body.action === "add-data") {
    const answer = String(body.answer || "").trim();
    if (!answer) return badRequest("answer is required");
    return respond(await c.addDataFromMissing().execute(user.uid, botId, id, answer));
  }

  return badRequest("Unknown action. Use 'resolve' or 'add-data'.");
}
