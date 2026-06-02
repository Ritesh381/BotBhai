"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

const NAV = [
  { href: "/dashboard", label: "📄 Documents" },
  { href: "/dashboard/test-chat", label: "💬 Test Chat" },
  { href: "/dashboard/missing", label: "📭 Missing Answers" },
  { href: "/dashboard/settings", label: "⚙️ Bot Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-white/10 flex flex-col p-4">
        <Link href="/dashboard" className="text-xl font-bold mb-8 px-2">
          BotBhai <span className="text-brand-500">🤖</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-600 text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 pt-4 mt-4">
          <p className="text-xs text-gray-500 px-2 mb-2 truncate">
            {user.email}
          </p>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto max-h-screen">{children}</main>
    </div>
  );
}
