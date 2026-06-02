import "server-only";

import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export interface AuthedUser {
  uid: string;
  email: string | null;
}

// Verifies the Firebase ID token sent as `Authorization: Bearer <token>`.
// Returns the user or null if missing/invalid.
export async function verifyRequest(
  req: NextRequest
): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
