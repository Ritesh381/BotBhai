"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/lib/v2/api-client";

export interface BotSummary {
  id: string;
  name: string;
  updatedAt?: number;
}

interface BotsContextValue {
  bots: BotSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  rename: (id: string, name: string) => Promise<boolean>;
  create: (name?: string) => Promise<BotSummary | null>;
}

const BotsContext = createContext<BotsContextValue | null>(null);

// Single source of truth for the signed-in user's bots, shared between the
// sidebar and all dashboard pages — so a rename anywhere updates everywhere
// without a page reload.
export function BotsProvider({ children }: { children: ReactNode }) {
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.get("/api/bots");
    if (Array.isArray(data)) setBots(data as BotSummary[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rename = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      // Optimistic update so the sidebar reflects the change instantly.
      setBots((prev) => prev.map((b) => (b.id === id ? { ...b, name: trimmed } : b)));
      const res = await api.patch(`/api/bots/${id}`, { name: trimmed });
      if (!res || res.error) {
        await refresh(); // revert to server truth on failure
        return false;
      }
      setBots((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: res.name ?? trimmed } : b))
      );
      return true;
    },
    [refresh]
  );

  const create = useCallback(
    async (name = "New Bot"): Promise<BotSummary | null> => {
      const data = await api.post("/api/bots", { name });
      if (data?.id) {
        await refresh();
        return data as BotSummary;
      }
      return null;
    },
    [refresh]
  );

  return (
    <BotsContext.Provider value={{ bots, loading, refresh, rename, create }}>
      {children}
    </BotsContext.Provider>
  );
}

export function useBots(): BotsContextValue {
  const ctx = useContext(BotsContext);
  if (!ctx) throw new Error("useBots must be used within BotsProvider");
  return ctx;
}
