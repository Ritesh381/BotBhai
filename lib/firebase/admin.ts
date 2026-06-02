import "server-only";

// Firebase Admin SDK — server-side only. Provides Firestore + token verification.
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "@/lib/config";

let app: App;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  const serviceAccount = JSON.parse(config.firebaseAdminJson());
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return app;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
