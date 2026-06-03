import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/src/composition/config";
import { getDb } from "@/src/adapters/persistence/firestore/firestore-client";
import { FirestoreBotRepository } from "@/src/adapters/persistence/firestore/firestore-bot-repository";
import { FirestoreEmbedKeyRepository } from "@/src/adapters/persistence/firestore/firestore-embed-key-repository";

export const runtime = "nodejs";

function cors(origin: string, allowedOrigins: string[]) {
  const ok = allowedOrigins.some(
    (o) => o === "*" || o === origin || origin.includes("localhost")
  );
  return ok ? origin : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const origin = req.headers.get("origin") || "";

  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const bots = new FirestoreBotRepository(db);
  const embedKeys = new FirestoreEmbedKeyRepository(db);

  const bot = await bots.findById(botId);
  if (!bot) return NextResponse.json({ error: { code: "not_found", message: "Bot not found" } }, { status: 404 });

  const publicKey = req.nextUrl.searchParams.get("key") || req.headers.get("x-embed-key") || "";
  const keyRecord = await embedKeys.findByPublicKey(publicKey);
  if (!keyRecord || keyRecord.botId !== botId) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Invalid embed key" } }, { status: 401 });
  }

  const allowedOrigin = cors(origin, bot.allowedOrigins);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  // Return ONLY public-safe persona/widget config — never system instructions, model, or knobs
  const publicConfig = {
    name: bot.name,
    avatarUrl: bot.widgetConfig.avatarUrl,
    primaryColor: bot.widgetConfig.primaryColor,
    position: bot.widgetConfig.position,
    greeting: bot.widgetConfig.greeting,
    welcomeMessage: bot.persona.welcome,
    suggestedQuestions: bot.persona.starterQuestions,
    fallbackMessage: bot.persona.fallback,
    showPoweredBy: bot.widgetConfig.showPoweredBy,
    leadCapture: bot.widgetConfig.leadCapture,
  };

  return NextResponse.json(publicConfig, { headers });
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const origin = req.headers.get("origin") || "";
  const cfg = loadConfig();
  const db = getDb(cfg.firebase.adminJson);
  const bot = await new FirestoreBotRepository(db).findById(botId);
  const allowed = bot ? cors(origin, bot.allowedOrigins) : null;
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowed || "",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-embed-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
