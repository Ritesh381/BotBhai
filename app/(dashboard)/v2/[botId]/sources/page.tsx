"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/v2/api-client";
import { auth } from "@/lib/firebase/client";

type DocStatus = "queued" | "processing" | "staging" | "ready" | "error";

interface Doc {
  id: string;
  filename: string;
  fileType: string;
  sizeBytes: number;
  chunkCount: number;
  status: DocStatus;
  error?: string;
  source: string;
  uploadedAt: number;
}

const STATUS_COLOR: Record<DocStatus, string> = {
  ready: "text-green-400",
  processing: "text-yellow-400",
  staging: "text-yellow-400",
  queued: "text-blue-400",
  error: "text-red-400",
};

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

export default function SourcesPage() {
  const { botId } = useParams<{ botId: string }>();
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [paste, setPaste] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await api.get(`/api/bots/${botId}/documents`);
    if (data?.documents) setDocs(data.documents);
    setLoading(false);
  }, [botId]);

  useEffect(() => { if (user && botId) load(); }, [user, botId, load]);

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const headers = await authHeaders();
    const res = await fetch(`/api/bots/${botId}/documents`, { method: "POST", headers, body: form });
    const data = await res.json();
    if (!res.ok) setError(data?.error?.message || "Upload failed");
    await load();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitPaste() {
    if (!pasteText.trim()) return;
    setError(""); setUploading(true);
    const data = await api.post(`/api/bots/${botId}/sources/paste`, { title: pasteTitle || "Pasted content", text: pasteText });
    if (data?.error) setError(data.error.message);
    setPaste(false); setPasteTitle(""); setPasteText("");
    await load();
    setUploading(false);
  }

  async function deleteDoc(id: string) {
    if (!confirm("Delete this source and its vectors?")) return;
    const headers = await authHeaders();
    await fetch(`/api/bots/${botId}/documents/${id}`, { method: "DELETE", headers });
    await load();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-gray-400 text-sm mt-1">Your bot answers from these documents.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv,.docx,.pptx" onChange={uploadFile} className="hidden" />
          <Button variant="secondary" onClick={() => setPaste(!paste)}>+ Paste text</Button>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Processing…" : "+ Upload file"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

      {paste && (
        <Card className="mb-6 space-y-3">
          <p className="font-medium text-sm">Paste content</p>
          <input
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            placeholder="Title (used as source label)"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder="Paste your text here…"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="flex gap-2">
            <Button onClick={submitPaste} disabled={!pasteText.trim() || uploading}>
              {uploading ? "Processing…" : "Add to knowledge base"}
            </Button>
            <Button variant="ghost" onClick={() => setPaste(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : docs.length === 0 ? (
        <Card className="text-center text-gray-400 py-12">
          No sources yet. Upload a file or paste text to start.
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between !py-4">
              <div>
                <p className="font-medium">{doc.filename}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.fileType.toUpperCase()} · {(doc.sizeBytes / 1024).toFixed(1)} KB ·{" "}
                  {doc.chunkCount} chunks ·{" "}
                  <span className={STATUS_COLOR[doc.status]}>{doc.status}</span>
                  {doc.error ? ` — ${doc.error}` : ""}
                </p>
              </div>
              <Button variant="danger" onClick={() => deleteDoc(doc.id)}>Delete</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
