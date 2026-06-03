import { NextRequest } from "next/server";
import { getContainer } from "@/src/composition/container";
import { respond, unauthorized, badRequest } from "@/src/lib/http/respond";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "Pasted content").trim();
  const text = String(body.text || "").trim();
  if (!text) return badRequest("text is required");

  return respond(
    await c.ingestDocument().execute({
      ownerId: user.uid,
      botId,
      filename: title,
      fileType: "md",
      sizeBytes: text.length,
      text,
    })
  );
}
