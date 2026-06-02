"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import type { ChatSource } from "@/types";

interface Message {
  role: "user" | "bot";
  content: string;
  sources?: ChatSource[];
  confident?: boolean;
}

export default function TestChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || !user || busy) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: user.uid, question }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          content: data.answer || data.error || "Something went wrong.",
          sources: data.sources,
          confident: data.confident,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", content: "Network error. Please try again." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Test Chat</h1>
        <p className="text-gray-400 text-sm mt-1">
          Try out your bot against your uploaded knowledge base.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">
            Ask a question to test retrieval and answering.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-white/[0.06] text-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <details className="mt-3 text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-200">
                    📎 {m.sources.length} source
                    {m.sources.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {m.sources.map((s, j) => (
                      <li
                        key={j}
                        className="border-l-2 border-brand-500/50 pl-2"
                      >
                        <span className="text-gray-300">{s.filename}</span>{" "}
                        <span className="text-gray-600">
                          (score {s.score})
                        </span>
                        <p className="text-gray-500 mt-0.5">{s.snippet}…</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-gray-500 text-sm">Thinking…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-4 border-t border-white/10 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your bot something…"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <Button type="submit" disabled={busy}>
          Send
        </Button>
      </form>
    </div>
  );
}
