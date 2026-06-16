"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/v2/api-client";

interface FeedbackEntry {
  id: string;
  question: string;
  answer: string;
  rating: "up" | "down";
  comment?: string;
  createdAt: number;
}

export default function FeedbackPage() {
  const { botId } = useParams<{ botId: string }>();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get(`/api/bots/${botId}/feedback`);
    if (Array.isArray(data?.feedback)) setEntries(data.feedback);
    setLoading(false);
  }, [botId]);

  useEffect(() => { load(); }, [load]);

  async function resolve(id: string) {
    await api.post(`/api/bots/${botId}/feedback`, { action: "resolve", id });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function revise(entry: FeedbackEntry) {
    if (!revision.trim()) return;
    setBusy(true);
    // Embed the correction into the knowledge base, then resolve the entry so
    // it leaves the list (the fix is now retrievable on the next query).
    await api.post(`/api/bots/${botId}/sources/paste`, {
      title: `Correction: ${entry.question.slice(0, 60)}`,
      text: `Question: ${entry.question}\n\nAnswer: ${revision}`,
    });
    await resolve(entry.id);
    setEditing(null);
    setRevision("");
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Low-rated Answers</h1>
      <p className="text-gray-400 text-sm mb-6">
        Thumbs-down answers. Revise the answer and it gets embedded into the knowledge base.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <Card className="text-center text-gray-400 py-12">
          No low-rated answers yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <Card key={e.id} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {new Date(e.createdAt).toLocaleDateString()} · 👎 Low-rated
                  </p>
                  <p className="font-medium text-sm">{e.question}</p>
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">{e.answer}</p>
                  {e.comment && (
                    <p className="text-gray-500 text-xs mt-1 italic">"{e.comment}"</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => setEditing(editing === e.id ? null : e.id)}
                  >
                    Revise
                  </Button>
                  <Button variant="ghost" onClick={() => resolve(e.id)}>
                    Dismiss
                  </Button>
                </div>
              </div>
              {editing === e.id && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <textarea
                    value={revision}
                    onChange={(ev) => setRevision(ev.target.value)}
                    rows={4}
                    placeholder="Write the correct answer…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => revise(e)}
                      disabled={busy || !revision.trim()}
                    >
                      {busy ? "Saving…" : "Save correction to knowledge base"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setEditing(null); setRevision(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
