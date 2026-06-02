import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import type { BotConfig } from "@/types";

const COLLECTION = "bots";

// For the MVP each user owns exactly one bot, keyed by their uid.
export async function getOrCreateBot(
  userId: string,
  email: string | null
): Promise<BotConfig> {
  const ref = adminDb().collection(COLLECTION).doc(userId);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as BotConfig;

  const now = Date.now();
  const bot: BotConfig = {
    botId: userId,
    userId,
    name: email ? `${email.split("@")[0]}'s Bot` : "My Bot",
    systemInstructions:
      "You are a helpful assistant. Answer questions based on the provided knowledge base.",
    tone: "professional",
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(bot);
  return bot;
}

export async function getBot(botId: string): Promise<BotConfig | null> {
  const snap = await adminDb().collection(COLLECTION).doc(botId).get();
  return snap.exists ? (snap.data() as BotConfig) : null;
}

export async function updateBot(
  userId: string,
  patch: Partial<Pick<BotConfig, "name" | "systemInstructions" | "tone">>
): Promise<BotConfig> {
  const ref = adminDb().collection(COLLECTION).doc(userId);
  await ref.set({ ...patch, updatedAt: Date.now() }, { merge: true });
  return (await ref.get()).data() as BotConfig;
}
