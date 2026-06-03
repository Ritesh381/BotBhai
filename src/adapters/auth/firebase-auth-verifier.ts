import "server-only";
import type { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import type { App } from "firebase-admin/app";

export interface AuthedUser {
  uid: string;
  email: string | null;
}

export class FirebaseAuthVerifier {
  constructor(private readonly adminApp: App) {}

  async verify(req: NextRequest): Promise<AuthedUser | null> {
    const header = req.headers.get("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    try {
      const decoded = await getAuth(this.adminApp).verifyIdToken(match[1]);
      return { uid: decoded.uid, email: decoded.email ?? null };
    } catch {
      return null;
    }
  }
}
