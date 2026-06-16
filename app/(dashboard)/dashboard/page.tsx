"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBots } from "@/lib/v2/bots-context";

export default function DashboardHome() {
  const router = useRouter();
  const { bots, loading, create } = useBots();
  const [creating, setCreating] = useState(false);

  async function createBot() {
    setCreating(true);
    const bot = await create("New Bot");
    if (bot?.id) router.push(`/dashboard/${bot.id}/sources`);
    setCreating(false);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Bots</h1>
          <p className="text-gray-400 text-sm mt-1">
            Each bot has its own knowledge base, persona, and embed widget.
          </p>
        </div>
        <Button onClick={createBot} disabled={creating}>
          {creating ? "Creating…" : "+ New Bot"}
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : bots.length === 0 ? (
        <Card className="text-center py-14">
          <p className="text-gray-400 mb-4">You haven't created any bots yet.</p>
          <Button onClick={createBot} disabled={creating}>
            {creating ? "Creating…" : "Create your first bot"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="flex items-center justify-between !py-4">
              <div>
                <p className="font-medium">{bot.name}</p>
                {bot.updatedAt && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Updated {new Date(bot.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link
                href={`/dashboard/${bot.id}/sources`}
                className="rounded-lg px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                Manage
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
