"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BotConfig, ResponseTone } from "@/types";

const TONES: { value: ResponseTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "humorous", label: "Humorous" },
];

export default function SettingsPage() {
  const { authHeaders } = useAuth();
  const [bot, setBot] = useState<BotConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch("/api/bot", { headers });
    if (res.ok) setBot((await res.json()).bot);
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!bot) return;
    setBusy(true);
    setSaved(false);
    const headers = {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    };
    const res = await fetch("/api/bot", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        name: bot.name,
        systemInstructions: bot.systemInstructions,
        tone: bot.tone,
      }),
    });
    if (res.ok) {
      setBot((await res.json()).bot);
      setSaved(true);
    }
    setBusy(false);
  }

  if (!bot) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Bot Settings</h1>
      <p className="text-gray-400 text-sm mb-6">
        Customize your bot's persona and how it responds.
      </p>

      <Card className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Bot name</label>
          <input
            value={bot.name}
            onChange={(e) => setBot({ ...bot, name: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            System instructions
          </label>
          <textarea
            value={bot.systemInstructions}
            onChange={(e) =>
              setBot({ ...bot, systemInstructions: e.target.value })
            }
            rows={4}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tone</label>
          <div className="flex gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setBot({ ...bot, tone: t.value })}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  bot.tone === t.value
                    ? "bg-brand-600 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-gray-500 mb-2">
            Your bot ID (used by the chat endpoint):
          </p>
          <code className="text-xs bg-black/30 rounded px-2 py-1 break-all">
            {bot.botId}
          </code>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
        </div>
      </Card>
    </div>
  );
}
