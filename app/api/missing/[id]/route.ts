import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebase/auth-server";
import { getOrCreateBot } from "@/lib/db/bots";
import { resolveMissing } from "@/lib/db/missing";
import { createDocument, updateDocument, Status } from "@/lib/db/documents";
import { embedPassages } from "@/lib/vector/embeddings";
import { upsertChunks, type UpsertVector } from "@/lib/vector/pinecone";
import { chunkText } from "@/lib/chunking/splitter";
import type { ChunkMetadata } from "@/types";

export const runtime = "nodejs";

// POST /api/missing/:id — feedback-loop action.
// Body: { action: "resolve" } | { action: "add-data", answer: string }
// "add-data" appends the supplied text to the knowledge base and resolves
// the entry; "resolve" just marks it handled.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bot = await getOrCreateBot(user.uid, user.email);
  const body = await req.json();

  if (body.action === "resolve") {
    await resolveMissing(bot.botId, id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add-data") {
    const answer = String(body.answer || "").trim();
    if (!answer) {
      return NextResponse.json({ error: "answer is required" }, { status: 400 });
    }

    const chunks = chunkText(answer);
    const filename = "Manual entry (from missing answers)";
    const doc = await createDocument({
      userId: user.uid,
      botId: bot.botId,
      filename,
      fileType: "md",
      sizeBytes: answer.length,
      chunkCount: chunks.length,
      status: Status.PROCESSING,
      uploadedAt: Date.now(),
    });

    const embeddings = await embedPassages(chunks);
    const vectors: UpsertVector[] = chunks.map((text, i) => {
      const metadata: ChunkMetadata = {
        documentId: doc.id,
        botId: bot.botId,
        userId: user.uid,
        filename,
        chunkIndex: i,
        text,
      };
      return { id: `${doc.id}::${i}`, values: embeddings[i], metadata };
    });
    await upsertChunks(bot.botId, vectors);
    await updateDocument(doc.id, { status: Status.READY });

    await resolveMissing(bot.botId, id);
    return NextResponse.json({ ok: true, documentId: doc.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
