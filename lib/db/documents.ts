import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import type { DocumentMeta, DocumentStatus } from "@/types";

const COLLECTION = "documents";

export async function createDocument(
  doc: Omit<DocumentMeta, "id">
): Promise<DocumentMeta> {
  const ref = adminDb().collection(COLLECTION).doc();
  const full: DocumentMeta = { ...doc, id: ref.id };
  await ref.set(full);
  return full;
}

export async function updateDocument(
  id: string,
  patch: Partial<Pick<DocumentMeta, "status" | "chunkCount" | "error">>
): Promise<void> {
  await adminDb().collection(COLLECTION).doc(id).set(patch, { merge: true });
}

export async function listDocuments(userId: string): Promise<DocumentMeta[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("uploadedAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as DocumentMeta);
}

export async function getDocument(id: string): Promise<DocumentMeta | null> {
  const snap = await adminDb().collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as DocumentMeta) : null;
}

export async function deleteDocument(id: string): Promise<void> {
  await adminDb().collection(COLLECTION).doc(id).delete();
}

export const Status = {
  PROCESSING: "processing" as DocumentStatus,
  READY: "ready" as DocumentStatus,
  ERROR: "error" as DocumentStatus,
};
