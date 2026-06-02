import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { MissingEntry } from "@/types";

const COLLECTION = "missing_entries";

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

// Records an unanswered question. Identical (normalized) questions for the
// same bot are deduped and their `timesAsked` counter is incremented.
export async function recordMissing(
  botId: string,
  question: string
): Promise<void> {
  const normalized = normalize(question);
  if (!normalized) return;

  const col = adminDb().collection(COLLECTION);
  const existing = await col
    .where("botId", "==", botId)
    .where("normalizedQuestion", "==", normalized)
    .limit(1)
    .get();

  const now = Date.now();
  if (!existing.empty) {
    await existing.docs[0].ref.update({
      timesAsked: FieldValue.increment(1),
      lastSeen: now,
    });
    return;
  }

  const ref = col.doc();
  const entry: MissingEntry = {
    id: ref.id,
    botId,
    question: question.trim(),
    normalizedQuestion: normalized,
    timesAsked: 1,
    status: "open",
    firstSeen: now,
    lastSeen: now,
  };
  await ref.set(entry);
}

export async function listMissing(
  botId: string,
  status: "open" | "resolved" = "open"
): Promise<MissingEntry[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("botId", "==", botId)
    .where("status", "==", status)
    .orderBy("timesAsked", "desc")
    .get();
  return snap.docs.map((d) => d.data() as MissingEntry);
}

export async function resolveMissing(
  botId: string,
  id: string
): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  // Guard: only resolve entries belonging to the caller's bot.
  if (snap.exists && (snap.data() as MissingEntry).botId === botId) {
    await ref.update({ status: "resolved" });
  }
}
