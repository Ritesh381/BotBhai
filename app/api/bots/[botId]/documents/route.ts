import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/src/composition/container";
import { respond, unauthorized, badRequest } from "@/src/lib/http/respond";
import { getSupportedType } from "@/src/core/domain/document";
import { MultiParser } from "@/src/adapters/parsing/multi-parser";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

// GET /api/bots/[botId]/documents — list sources for a bot
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;
  const result = await c.listDocuments().execute(user.uid, botId);
  if (!result.ok) return respond(result);
  return NextResponse.json({ documents: result.value });
}

// POST /api/bots/[botId]/documents — upload + async ingest a file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;

  const form = await req.formData().catch(() => null);
  if (!form) return badRequest("multipart/form-data required");

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("No file provided");
  if (file.size > MAX_BYTES) return badRequest("File too large (max 10 MB)");

  const fileType = getSupportedType(file.name);
  if (!fileType) return badRequest("Unsupported type. Use pdf, txt, md, csv, docx, or pptx.");

  // Extract text before enqueueing so the in-process queue has it immediately
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new MultiParser();
  let text: string;
  try {
    const parsed = await parser.extract(buffer, fileType);
    text = parsed.text;
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Failed to parse file");
  }

  return respond(
    await c.ingestDocument().execute({
      ownerId: user.uid,
      botId,
      filename: file.name,
      fileType,
      sizeBytes: file.size,
      text,
    })
  );
}
