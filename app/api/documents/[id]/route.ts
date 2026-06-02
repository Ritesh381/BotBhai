import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebase/auth-server";
import { getDocument, deleteDocument } from "@/lib/db/documents";
import { deleteDocumentVectors } from "@/lib/vector/pinecone";

export const runtime = "nodejs";

// DELETE /api/documents/:id — remove a document's vectors + metadata.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc || doc.userId !== user.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteDocumentVectors(doc.botId, id);
  } catch {
    // Even if vector cleanup fails, remove metadata so the doc disappears
    // from the dashboard; orphaned vectors can be reaped separately.
  }
  await deleteDocument(id);

  return NextResponse.json({ ok: true });
}
