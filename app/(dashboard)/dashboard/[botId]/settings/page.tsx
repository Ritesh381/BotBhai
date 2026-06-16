"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/v2/api-client";
import { useBots } from "@/lib/v2/bots-context";

type Tone = "professional" | "friendly" | "humorous";
const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "humorous", label: "Humorous" },
];

interface BotSettings {
  id: string;
  name: string;
  persona: {
    systemInstructions: string;
    tone: Tone;
    welcome: string;
    fallback: string;
    starterQuestions: string[];
  };
  widgetConfig: { primaryColor: string; position: string };
  retrievalConfig: { topK: number; finalK: number; minScore: number; rerank: boolean };
  modelConfig: { model: string; temperature: number; maxTokens: number };
}

export default function SettingsPage() {
  const { botId } = useParams<{ botId: string }>();
  const { user } = useAuth();
  const { refresh } = useBots();
  const [bot, setBot] = useState<BotSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starterInput, setStarterInput] = useState("");

  const load = useCallback(async () => {
    const data = await api.get(`/api/bots/${botId}`);
    if (data?.id) setBot(data);
  }, [botId]);

  useEffect(() => { if (user && botId) load(); }, [user, botId, load]);

  async function save() {
    if (!bot) return;
    setBusy(true); setSaved(false);
    await api.patch(`/api/bots/${botId}`, {
      name: bot.name,
      persona: bot.persona,
      widgetConfig: bot.widgetConfig,
      retrievalConfig: bot.retrievalConfig,
      modelConfig: bot.modelConfig,
    });
    // Sync the shared bots list so the sidebar reflects the new name without a reload.
    await refresh();
    setSaved(true); setBusy(false);
  }

  if (!bot) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="space-y-4">
        <p className="font-semibold">Identity</p>
        <div>
          <label className="block text-sm mb-1">Bot name</label>
          <input value={bot.name} onChange={(e) => setBot({ ...bot, name: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-sm mb-1">System instructions</label>
          <textarea value={bot.persona.systemInstructions} rows={4}
            onChange={(e) => setBot({ ...bot, persona: { ...bot.persona, systemInstructions: e.target.value } })}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-sm mb-1">Welcome message</label>
          <input value={bot.persona.welcome}
            onChange={(e) => setBot({ ...bot, persona: { ...bot.persona, welcome: e.target.value } })}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-sm mb-1">Fallback message (when bot can't answer)</label>
          <input value={bot.persona.fallback}
            onChange={(e) => setBot({ ...bot, persona: { ...bot.persona, fallback: e.target.value } })}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-sm mb-1">Tone</label>
          <div className="flex gap-2">
            {TONES.map((t) => (
              <button key={t.value}
                onClick={() => setBot({ ...bot, persona: { ...bot.persona, tone: t.value } })}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${bot.persona.tone === t.value ? "bg-brand-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Starter questions</label>
          <div className="flex gap-2 mb-2">
            <input value={starterInput} onChange={(e) => setStarterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && starterInput.trim()) {
                  setBot({ ...bot, persona: { ...bot.persona, starterQuestions: [...bot.persona.starterQuestions, starterInput.trim()] } });
                  setStarterInput("");
                  e.preventDefault();
                }
              }}
              placeholder="Type a question, press Enter to add"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            {bot.persona.starterQuestions.map((q, i) => (
              <span key={i} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 text-xs">
                {q}
                <button onClick={() => setBot({ ...bot, persona: { ...bot.persona, starterQuestions: bot.persona.starterQuestions.filter((_, j) => j !== i) } })} className="text-gray-400 hover:text-red-400">✕</button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="font-semibold">Widget</p>
        <div>
          <label className="block text-sm mb-1">Brand color</label>
          <input type="color" value={bot.widgetConfig.primaryColor}
            onChange={(e) => setBot({ ...bot, widgetConfig: { ...bot.widgetConfig, primaryColor: e.target.value } })}
            className="h-10 w-20 rounded border-0 bg-transparent cursor-pointer" />
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="font-semibold">Advanced retrieval</p>
        {[
          { label: `Candidate pool (topK = ${bot.retrievalConfig.topK})`, key: "topK", min: 3, max: 20 },
          { label: `Final chunks to LLM (finalK = ${bot.retrievalConfig.finalK})`, key: "finalK", min: 1, max: 10 },
        ].map(({ label, key, min, max }) => (
          <div key={key}>
            <label className="block text-sm mb-1">{label}</label>
            <input type="range" min={min} max={max}
              value={bot.retrievalConfig[key as "topK" | "finalK"]}
              onChange={(e) => setBot({ ...bot, retrievalConfig: { ...bot.retrievalConfig, [key]: Number(e.target.value) } })}
              className="w-full" />
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-gray-500 mb-1">Bot ID</p>
        <code className="text-xs bg-black/30 rounded px-2 py-1 break-all">{bot.id}</code>
      </div>
    </div>
  );
}
