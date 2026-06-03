"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/v2/api-client";

interface Bot { id: string; name: string }

const BOT_NAV = [
  { href: (id: string) => `/v2/${id}/sources`, label: "📄 Sources" },
  { href: (id: string) => `/v2/${id}/test-chat`, label: "💬 Test Chat" },
  { href: (id: string) => `/v2/${id}/embed`, label: "🔗 Embed" },
  { href: (id: string) => `/v2/${id}/missing`, label: "📭 Missing Answers" },
  { href: (id: string) => `/v2/${id}/analytics`, label: "📊 Analytics" },
  { href: (id: string) => `/v2/${id}/feedback`, label: "👎 Feedback" },
  { href: (id: string) => `/v2/${id}/settings`, label: "⚙️ Settings" },
];

export default function V2DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ botId?: string }>();
  const activeBotId = params?.botId || "";

  const [bots, setBots] = useState<Bot[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const loadBots = useCallback(async () => {
    const data = await api.get("/api/bots");
    if (Array.isArray(data)) setBots(data);
  }, []);

  useEffect(() => { if (user) loadBots(); }, [user, loadBots]);

  async function createBot() {
    setCreating(true);
    const data = await api.post("/api/bots", { name: "New Bot" });
    if (data?.id) {
      await loadBots();
      router.push(`/v2/${data.id}/sources`);
    }
    setCreating(false);
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-white/10 flex flex-col p-4 shrink-0">
        <Link href="/v2" className="text-xl font-bold mb-4 px-2 block">
          BotBhai <span className="text-brand-500">🤖</span>
        </Link>

        {/* Bot switcher */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 px-2 mb-1 uppercase tracking-wide">Your Bots</p>
          <div className="space-y-0.5">
            {bots.map((bot) => (
              <Link
                key={bot.id}
                href={`/v2/${bot.id}/sources`}
                className={`block rounded-lg px-3 py-1.5 text-sm truncate transition-colors ${
                  activeBotId === bot.id
                    ? "bg-brand-600 text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {bot.name}
              </Link>
            ))}
          </div>
          <Button
            variant="ghost"
            className="w-full mt-2 text-xs"
            onClick={createBot}
            disabled={creating}
          >
            {creating ? "Creating…" : "+ New Bot"}
          </Button>
        </div>

        {/* Per-bot nav */}
        {activeBotId && (
          <nav className="flex-1 space-y-0.5 border-t border-white/10 pt-4">
            {BOT_NAV.map((item) => {
              const href = item.href(activeBotId);
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? "bg-brand-600 text-white" : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="border-t border-white/10 pt-3 mt-4">
          <p className="text-xs text-gray-500 px-2 mb-2 truncate">{user.email}</p>
          <Button variant="ghost" className="w-full" onClick={() => signOut()}>Sign out</Button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto max-h-screen">{children}</main>
    </div>
  );
}
