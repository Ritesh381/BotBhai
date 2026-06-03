import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/src/composition/container";
import { unauthorized } from "@/src/lib/http/respond";
import { getDb } from "@/src/adapters/persistence/firestore/firestore-client";
import { PineconeVectorStore } from "@/src/adapters/vector/pinecone-vector-store";
import { loadConfig } from "@/src/composition/config";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string; id: string }> }
) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId, id } = await params;

  // Verify ownership
  const owned = await c.getBot().execute(user.uid, botId);
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.error.httpStatus });

  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const doc = await db.collection("v2_documents").doc(id).get();
  if (!doc.exists || doc.data()?.botId !== botId) {
    return NextResponse.json({ error: { code: "not_found", message: "Document not found" } }, { status: 404 });
  }

  const vectors = new PineconeVectorStore(cfg.pinecone);
  try { await vectors.deleteByDocument(botId, id); } catch { /* orphan reaper will clean up */ }
  await db.collection("v2_documents").doc(id).delete();

  return NextResponse.json({ ok: true });
}
