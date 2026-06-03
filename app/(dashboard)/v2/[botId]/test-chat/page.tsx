"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "bot";
  content: string;
  sources?: { filename: string; snippet: string; score: number }[];
  confident?: boolean;
}

export default function TestChatPage() {
  const { botId } = useParams<{ botId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setStreaming(true);
    setMessages((m) => [...m, { role: "bot", content: "" }]);

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : "";

      const res = await fetch(`/api/bots/${botId}/test-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      });
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let eventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) { eventType = line.slice(7).trim(); continue; }
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (eventType === "token") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + data.t };
              return copy;
            });
          } else if (eventType === "sources") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], sources: data.sources };
              return copy;
            });
          } else if (eventType === "done") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], confident: data.confident };
              return copy;
            });
          }
        }
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "bot", content: "Something went wrong. Please try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Test Chat</h1>
        <p className="text-gray-400 text-sm mt-1">Test retrieval and streaming answers against your knowledge base.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">Ask your bot a question to test it.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user" ? "bg-brand-600 text-white" : "bg-white/[0.06] text-gray-100"
            }`}>
              <p className="whitespace-pre-wrap">{m.content}{streaming && i === messages.length - 1 && m.role === "bot" && !m.content ? "…" : ""}</p>
              {m.sources && m.sources.length > 0 && (
                <details className="mt-3 text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-200">📎 {m.sources.length} source{m.sources.length > 1 ? "s" : ""}</summary>
                  <ul className="mt-2 space-y-2">
                    {m.sources.map((s, j) => (
                      <li key={j} className="border-l-2 border-brand-500/50 pl-2">
                        <span className="text-gray-300">{s.filename}</span> <span className="text-gray-600">(score {s.score})</span>
                        <p className="text-gray-500 mt-0.5">{s.snippet}…</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-4 border-t border-white/10 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your bot something…"
          disabled={streaming}
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <Button type="submit" disabled={streaming || !input.trim()}>Send</Button>
      </form>
    </div>
  );
}
