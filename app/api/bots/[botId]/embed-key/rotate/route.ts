import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/src/composition/container";
import { unauthorized } from "@/src/lib/http/respond";
import { loadConfig } from "@/src/composition/config";
import { getDb } from "@/src/adapters/persistence/firestore/firestore-client";
import { FirestoreEmbedKeyRepository } from "@/src/adapters/persistence/firestore/firestore-embed-key-repository";
import { generatePublicKey } from "@/src/core/domain/embed-key";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const c = getContainer();
  const user = await c.authVerifier.verify(req);
  if (!user) return unauthorized();
  const { botId } = await params;

  const owned = await c.getBot().execute(user.uid, botId);
  if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.error.httpStatus });

  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const embedKeys = new FirestoreEmbedKeyRepository(db);

  await embedKeys.revokeAll(botId);
  const key = await embedKeys.create({
    id: uuid(),
    botId,
    publicKey: generatePublicKey(),
    createdAt: Date.now(),
    revoked: false,
  });

  return NextResponse.json({ publicKey: key.publicKey });
}
