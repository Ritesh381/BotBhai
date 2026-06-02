"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DocumentMeta } from "@/types";

const STATUS_STYLE: Record<string, string> = {
  ready: "text-green-400",
  processing: "text-yellow-400",
  error: "text-red-400",
};

export default function DocumentsPage() {
  const { authHeaders } = useAuth();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch("/api/documents", { headers });
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents);
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const headers = await authHeaders();
      const res = await fetch("/api/documents", {
        method: "POST",
        headers,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Upload failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document and its vectors?")) return;
    const headers = await authHeaders();
    await fetch(`/api/documents/${id}`, { method: "DELETE", headers });
    await load();
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-400 text-sm mt-1">
            Upload PDF, TXT, MD, or CSV files to build your bot's knowledge base.
          </p>
        </div>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md,.csv"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Ingesting…" : "+ Upload document"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : docs.length === 0 ? (
        <Card className="text-center text-gray-400 py-12">
          No documents yet. Upload one to get started.
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card
              key={doc.id}
              className="flex items-center justify-between !py-4"
            >
              <div>
                <p className="font-medium">{doc.filename}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.fileType.toUpperCase()} ·{" "}
                  {(doc.sizeBytes / 1024).toFixed(1)} KB · {doc.chunkCount}{" "}
                  chunks ·{" "}
                  <span className={STATUS_STYLE[doc.status] || ""}>
                    {doc.status}
                  </span>
                  {doc.error ? ` — ${doc.error}` : ""}
                </p>
              </div>
              <Button variant="danger" onClick={() => handleDelete(doc.id)}>
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
