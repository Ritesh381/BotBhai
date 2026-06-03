import { NextRequest } from "next/server";
import { getContainer } from "@/src/composition/container";
import { respond, unauthorized } from "@/src/lib/http/respond";
import type { BotEditableFields } from "@/src/core/domain/bot";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;
  return respond(await c.getBot().execute(user.uid, botId));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Partial<BotEditableFields> = {};
  if (body.name !== undefined) patch.name = String(body.name).slice(0, 80);
  if (body.persona !== undefined) patch.persona = body.persona;
  if (body.widgetConfig !== undefined) patch.widgetConfig = body.widgetConfig;
  if (body.retrievalConfig !== undefined) patch.retrievalConfig = body.retrievalConfig;
  if (body.modelConfig !== undefined) patch.modelConfig = body.modelConfig;
  if (Array.isArray(body.allowedOrigins)) patch.allowedOrigins = body.allowedOrigins;
  return respond(await c.updateBot().execute(user.uid, botId, patch));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;
  return respond(await c.deleteBot().execute(user.uid, botId));
}
