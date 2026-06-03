"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/v2/api-client";

export default function EmbedConfigPage() {
  const { botId } = useParams<{ botId: string }>();
  const [embedKey, setEmbedKey] = useState<string | null>(null);
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
  const [originInput, setOriginInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.botbhai.com";

  const load = useCallback(async () => {
    const [botData, keyData] = await Promise.all([
      api.get(`/api/bots/${botId}`),
      api.get(`/api/bots/${botId}/embed-key`),
    ]);
    if (Array.isArray(botData?.allowedOrigins)) setAllowedOrigins(botData.allowedOrigins);
    if (keyData?.publicKey) setEmbedKey(keyData.publicKey);
  }, [botId]);

  useEffect(() => { load(); }, [load]);

  const snippet = embedKey
    ? `<script\n  src="${appUrl}/embed.js"\n  data-bot-id="${botId}"\n  data-key="${embedKey}"\n  async\n></script>`
    : "";

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function rotateKey() {
    setRotating(true);
    const data = await api.post(`/api/bots/${botId}/embed-key/rotate`, {});
    if (data?.publicKey) setEmbedKey(data.publicKey);
    setRotating(false);
  }

  async function addOrigin() {
    const o = originInput.trim();
    if (!o || allowedOrigins.includes(o)) return;
    const next = [...allowedOrigins, o];
    await api.patch(`/api/bots/${botId}`, { allowedOrigins: next });
    setAllowedOrigins(next);
    setOriginInput("");
  }

  async function removeOrigin(o: string) {
    const next = allowedOrigins.filter((x) => x !== o);
    await api.patch(`/api/bots/${botId}`, { allowedOrigins: next });
    setAllowedOrigins(next);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Embed Config</h1>
        <p className="text-gray-400 text-sm mt-1">
          Add this snippet to any website to embed your bot as a floating chat bubble.
        </p>
      </div>

      {/* Snippet */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Embed snippet</p>
        <pre className="bg-black/30 rounded-lg p-3 text-xs text-green-400 overflow-x-auto whitespace-pre">
          {snippet || "Loading…"}
        </pre>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={copy} disabled={!snippet}>
            {copied ? "Copied ✓" : "Copy snippet"}
          </Button>
          <Button variant="secondary" onClick={rotateKey} disabled={rotating}>
            {rotating ? "Rotating…" : "Rotate key"}
          </Button>
        </div>
        {embedKey && (
          <p className="text-xs text-gray-500">
            Public embed key: <code className="bg-black/20 px-1 rounded">{embedKey}</code>
          </p>
        )}
      </Card>

      {/* Allowed origins */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Allowed origins (CORS)</p>
        <p className="text-xs text-gray-500">
          Only requests from these domains will be accepted.{" "}
          <code className="bg-black/20 px-1 rounded">localhost</code> is always allowed.
        </p>
        <div className="flex gap-2">
          <input
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOrigin(); } }}
            placeholder="https://mywebsite.com"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <Button onClick={addOrigin} disabled={!originInput.trim()}>Add</Button>
        </div>
        {allowedOrigins.length > 0 && (
          <ul className="space-y-1">
            {allowedOrigins.map((o) => (
              <li
                key={o}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm"
              >
                <span className="text-gray-300 truncate">{o}</span>
                <button
                  onClick={() => removeOrigin(o)}
                  className="text-gray-500 hover:text-red-400 text-xs ml-3 shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Live preview */}
      <Card>
        <p className="text-sm font-medium mb-1">Live preview</p>
        <p className="text-xs text-gray-500 mb-3">
          This is how the chat UI looks inside the iframe bubble.
        </p>
        {embedKey ? (
          <iframe
            src={`/embed/${botId}?key=${encodeURIComponent(embedKey)}`}
            className="w-full rounded-xl border border-white/10"
            style={{ height: 520 }}
            title="Widget preview"
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
            Loading preview…
          </div>
        )}
      </Card>
    </div>
  );
}
