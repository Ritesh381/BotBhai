import "server-only";

import { config } from "@/lib/config";

const JINA_URL = "https://api.jina.ai/v1/embeddings";

interface JinaResponse {
  data: { index: number; embedding: number[] }[];
  usage?: { total_tokens: number };
}

// `task` lets Jina v3 produce asymmetric embeddings tuned for retrieval.
type EmbedTask = "retrieval.passage" | "retrieval.query";

async function callJina(input: string[], task: EmbedTask): Promise<number[][]> {
  const res = await fetch(JINA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.jina.apiKey()}`,
    },
    body: JSON.stringify({
      model: config.jina.model,
      task,
      dimensions: config.jina.dimensions,
      embedding_type: "float",
      input,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jina embeddings failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as JinaResponse;
  // Jina preserves input order in `index`; sort defensively.
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// Embed document chunks for storage. Batches to stay within request limits.
export async function embedPassages(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 64;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    out.push(...(await callJina(batch, "retrieval.passage")));
  }
  return out;
}

// Embed a single user query for similarity search.
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await callJina([text], "retrieval.query");
  return vec;
}
