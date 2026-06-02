"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { MissingEntry } from "@/types";

export default function MissingPage() {
  const { authHeaders } = useAuth();
  const [entries, setEntries] = useState<MissingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch("/api/missing?status=open", { headers });
    if (res.ok) setEntries((await res.json()).entries);
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, body: object) {
    setBusy(true);
    const headers = {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    };
    await fetch(`/api/missing/${id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    setEditing(null);
    setAnswer("");
    setBusy(false);
    await load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Missing Answers</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        Questions your bot couldn't answer. Add data to fill the gap — it's
        embedded and added to the knowledge base instantly.
      </p>

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
                    Asked {e.timesAsked} time{e.timesAsked > 1 ? "s" : ""} · last
                    seen {new Date(e.lastSeen).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditing(editing === e.id ? null : e.id)
                    }
                  >
                    Add data
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => act(e.id, { action: "resolve" })}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>

              {editing === e.id && (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={answer}
                    onChange={(ev) => setAnswer(ev.target.value)}
                    rows={4}
                    placeholder="Write the answer / info to add to the knowledge base…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <Button
                    onClick={() => act(e.id, { action: "add-data", answer })}
                    disabled={busy || !answer.trim()}
                  >
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
