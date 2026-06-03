import "server-only";
import type { EmbeddingProvider } from "@core/ports/embedding-provider";

const JINA_URL = "https://api.jina.ai/v1/embeddings";

interface JinaResponse {
  data: { index: number; embedding: number[] }[];
}

type EmbedTask = "retrieval.passage" | "retrieval.query";

interface JinaConfig {
  apiKey: string;
  model: string;
  dimensions: number;
}

async function callJina(
  input: string[],
  task: EmbedTask,
  cfg: JinaConfig
): Promise<number[][]> {
  const res = await fetch(JINA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      task,
      dimensions: cfg.dimensions,
      embedding_type: "float",
      input,
    }),
  });
  if (!res.ok) throw new Error(`Jina embeddings failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as JinaResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export class JinaEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(private readonly cfg: JinaConfig) {
    this.dimensions = cfg.dimensions;
  }

  async embedPassages(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    const BATCH = 64;
    for (let i = 0; i < texts.length; i += BATCH) {
      out.push(...(await callJina(texts.slice(i, i + BATCH), "retrieval.passage", this.cfg)));
    }
    return out;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vec] = await callJina([text], "retrieval.query", this.cfg);
    return vec;
  }
}
