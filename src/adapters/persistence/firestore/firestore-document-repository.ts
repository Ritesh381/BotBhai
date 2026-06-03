import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { DocumentRepository, StatusPatch } from "@core/ports/repositories/document-repository";
import type { Document } from "@core/domain/document";

const COLLECTION = "v2_documents";

export class FirestoreDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Firestore) {}

  async create(doc: Document): Promise<Document> {
    await this.db.collection(COLLECTION).doc(doc.id).set(doc);
    return doc;
  }

  async findById(id: string): Promise<Document | null> {
    const snap = await this.db.collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as Document) : null;
  }

  async listByBot(botId: string): Promise<Document[]> {
    const snap = await this.db
      .collection(COLLECTION)
      .where("botId", "==", botId)
      .orderBy("uploadedAt", "desc")
      .get();
    return snap.docs.map((d) => d.data() as Document);
  }

  async updateStatus(id: string, patch: StatusPatch): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).set(patch, { merge: true });
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).delete();
  }
}
