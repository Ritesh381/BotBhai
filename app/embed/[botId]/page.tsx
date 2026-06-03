"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface BotConfig {
  name: string;
  avatarUrl?: string;
  primaryColor: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  fallbackMessage: string;
  showPoweredBy: boolean;
}

interface Message {
  role: "user" | "bot";
  content: string;
  sources?: { filename: string; snippet: string; score: number }[];
  confident?: boolean;
}

export default function EmbedPage() {
  const { botId } = useParams<{ botId: string }>();
  const searchParams = useSearchParams();
  const embedKey = searchParams.get("key") || "";

  const [config, setConfig] = useState<BotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botId || !embedKey) return;
    fetch(`/api/v1/embed/${botId}/config?key=${embedKey}`)
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(console.error);
  }, [botId, embedKey]);

  const primary = config?.primaryColor || "#4f46e5";

  async function send(question: string) {
    if (!question.trim() || streaming) return;
    setInput("");
    setStarted(true);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setStreaming(true);

    const botMsg: Message = { role: "bot", content: "" };
    setMessages((m) => [...m, botMsg]);

    try {
      const res = await fetch(`/api/v1/embed/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-embed-key": embedKey },
        body: JSON.stringify({ question, key: embedKey }),
      });
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          if (line.startsWith("data: ")) {
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
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "bot", content: config?.fallbackMessage || "Something went wrong." };
        return copy;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400 text-sm bg-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans text-sm bg-white text-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ backgroundColor: primary }}>
        {config.avatarUrl && (
          <img src={config.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
        )}
        <span className="font-semibold text-white">{config.name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {!started && (
          <div className="space-y-2">
            <p className="text-gray-600">{config.welcomeMessage}</p>
            {config.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50 transition-colors"
                    style={{ borderColor: primary, color: primary }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "text-white" : "bg-gray-100 text-gray-900"
              }`}
              style={m.role === "user" ? { backgroundColor: primary } : {}}
            >
              <p className="whitespace-pre-wrap">{m.content || (streaming ? "…" : "")}</p>
              {m.sources && m.sources.length > 0 && (
                <details className="mt-2 text-xs text-gray-500">
                  <summary className="cursor-pointer">📎 {m.sources.length} source{m.sources.length > 1 ? "s" : ""}</summary>
                  <ul className="mt-1 space-y-1">
                    {m.sources.map((s, j) => (
                      <li key={j} className="border-l-2 pl-2" style={{ borderColor: primary }}>
                        <span className="font-medium">{s.filename}</span>
                        <p className="text-gray-400">{s.snippet}…</p>
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

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2 px-3 py-2 border-t"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-full border px-3 py-1.5 text-sm outline-none focus:ring-1"
          style={{ "--ring-color": primary } as React.CSSProperties}
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-full px-4 py-1.5 text-sm text-white font-medium disabled:opacity-50"
          style={{ backgroundColor: primary }}
        >
          Send
        </button>
      </form>

      {config.showPoweredBy && (
        <p className="text-center text-[10px] text-gray-400 pb-1">
          Powered by <span className="font-medium">BotBhai</span>
        </p>
      )}
    </div>
  );
}
