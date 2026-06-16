"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { BotsProvider, useBots } from "@/lib/v2/bots-context";

const BOT_NAV = [
  { href: (id: string) => `/dashboard/${id}/sources`, label: "📄 Sources" },
  { href: (id: string) => `/dashboard/${id}/test-chat`, label: "💬 Test Chat" },
  { href: (id: string) => `/dashboard/${id}/embed`, label: "🔗 Embed" },
  { href: (id: string) => `/dashboard/${id}/missing`, label: "📭 Missing Answers" },
  { href: (id: string) => `/dashboard/${id}/analytics`, label: "📊 Analytics" },
  { href: (id: string) => `/dashboard/${id}/feedback`, label: "👎 Feedback" },
  { href: (id: string) => `/dashboard/${id}/settings`, label: "⚙️ Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <BotsProvider>
      <DashboardShell>{children}</DashboardShell>
    </BotsProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { bots, create, rename } = useBots();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ botId?: string }>();
  const activeBotId = params?.botId || "";

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // Guards the onBlur save so Escape cancels and Enter doesn't double-save.
  const skipBlurRef = useRef(false);

  async function createBot() {
    setCreating(true);
    const bot = await create("New Bot");
    if (bot?.id) router.push(`/dashboard/${bot.id}/sources`);
    setCreating(false);
  }

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditValue(currentName);
  }

  function clearEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit() {
    const id = editingId;
    const value = editValue;
    clearEdit();
    if (id) await rename(id, value);
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-white/10 flex flex-col p-4 shrink-0">
        <Link href="/dashboard" className="mb-4 px-2 block">
          <Logo size={32} className="text-lg" />
        </Link>

        {/* Bot switcher */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 px-2 mb-1 uppercase tracking-wide">Your Bots</p>
          <div className="space-y-0.5">
            {bots.map((bot) =>
              editingId === bot.id ? (
                <input
                  key={bot.id}
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (skipBlurRef.current) { skipBlurRef.current = false; return; }
                    saveEdit();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); skipBlurRef.current = true; saveEdit(); }
                    if (e.key === "Escape") { skipBlurRef.current = true; clearEdit(); }
                  }}
                  className="w-full rounded-lg bg-white/10 border border-brand-500 px-3 py-1.5 text-sm outline-none"
                />
              ) : (
                <div
                  key={bot.id}
                  className={`group flex items-center rounded-lg pr-1 transition-colors ${
                    activeBotId === bot.id ? "bg-brand-600 text-white" : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <Link
                    href={`/dashboard/${bot.id}/sources`}
                    className="flex-1 px-3 py-1.5 text-sm truncate"
                    title={bot.name}
                  >
                    {bot.name}
                  </Link>
                  <button
                    aria-label={`Rename ${bot.name}`}
                    onClick={(e) => { e.preventDefault(); startEdit(bot.id, bot.name); }}
                    className="opacity-0 group-hover:opacity-100 px-1.5 text-xs text-gray-400 hover:text-white transition-opacity"
                  >
                    ✎
                  </button>
                </div>
              )
            )}
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
          <p className="text-xs text-gray-500 px-2 mb-2 truncate">{user?.email}</p>
          <Button variant="ghost" className="w-full" onClick={() => signOut()}>Sign out</Button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto max-h-screen">{children}</main>
    </div>
  );
}
