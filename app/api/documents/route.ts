import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebase/auth-server";
import { getOrCreateBot } from "@/lib/db/bots";
import {
  createDocument,
  listDocuments,
  Status,
} from "@/lib/db/documents";
import { getFileType } from "@/lib/chunking/parse";
import { ingestDocument } from "@/lib/ingest";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// GET /api/documents — list the signed-in user's documents.
export async function GET(req: NextRequest) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await listDocuments(user.uid);
  return NextResponse.json({ documents: docs });
}

// POST /api/documents — upload + ingest a file (multipart/form-data, field "file").
export async function POST(req: NextRequest) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileType = getFileType(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Use pdf, txt, md, or csv." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10 MB)." },
      { status: 400 }
    );
  }

  const bot = await getOrCreateBot(user.uid, user.email);
  const buffer = Buffer.from(await file.arrayBuffer());

  // Create the metadata row up front so the UI can show "processing".
  const doc = await createDocument({
    userId: user.uid,
    botId: bot.botId,
    filename: file.name,
    fileType,
    sizeBytes: file.size,
    chunkCount: 0,
    status: Status.PROCESSING,
    uploadedAt: Date.now(),
  });

  try {
    const { chunkCount } = await ingestDocument({
      buffer,
      fileType,
      documentId: doc.id,
      botId: bot.botId,
      userId: user.uid,
      filename: file.name,
    });
    return NextResponse.json({
      document: { ...doc, status: Status.READY, chunkCount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json(
      { document: { ...doc, status: Status.ERROR, error: message }, error: message },
      { status: 500 }
    );
  }
}
