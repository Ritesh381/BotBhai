"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/v2/api-client";

interface MissingEntry { id: string; question: string; timesAsked: number; lastSeen: number }

export default function MissingPage() {
  const { botId } = useParams<{ botId: string }>();
  const { user } = useAuth();
  const [entries, setEntries] = useState<MissingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get(`/api/bots/${botId}/missing?status=open`);
    if (Array.isArray(data)) setEntries(data);
    setLoading(false);
  }, [botId]);

  useEffect(() => { if (user && botId) load(); }, [user, botId, load]);

  async function act(id: string, body: object) {
    setBusy(true);
    await api.post(`/api/bots/${botId}/missing/${id}`, body);
    setEditing(null); setAnswer("");
    setBusy(false);
    await load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Missing Answers</h1>
      <p className="text-gray-400 text-sm mb-6">Questions your bot couldn't answer. Add data to fill the gap — embedded instantly.</p>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <Card className="text-center text-gray-400 py-12">
          🎉 No unanswered questions. Your knowledge base is covering everything.
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{e.question}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Asked {e.timesAsked} time{e.timesAsked > 1 ? "s" : ""} · last seen {new Date(e.lastSeen).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" onClick={() => setEditing(editing === e.id ? null : e.id)}>Add data</Button>
                  <Button variant="ghost" onClick={() => act(e.id, { action: "resolve" })} disabled={busy}>Dismiss</Button>
                </div>
              </div>
              {editing === e.id && (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={answer}
                    onChange={(ev) => setAnswer(ev.target.value)}
                    rows={4}
                    placeholder="Write the answer or info to add to the knowledge base…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <Button onClick={() => act(e.id, { action: "add-data", answer })} disabled={busy || !answer.trim()}>
                    {busy ? "Saving…" : "Save to knowledge base"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
