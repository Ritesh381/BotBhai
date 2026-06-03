import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

export function getAdminApp(serviceAccountJson: string): App {
  if (app) return app;
  if (getApps().length) { app = getApps()[0]; return app; }
  const sa = JSON.parse(serviceAccountJson);
  app = initializeApp({ credential: cert(sa), projectId: sa.project_id });
  return app;
}

export function getDb(serviceAccountJson: string): Firestore {
  return getFirestore(getAdminApp(serviceAccountJson));
}
