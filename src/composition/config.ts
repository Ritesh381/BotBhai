import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("REPLACE_ME"))
    throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export interface AppConfig {
  jina: { apiKey: string; model: string; dimensions: number };
  groq: { apiKey: string; model: string };
  pinecone: { apiKey: string; indexName: string };
  firebase: { adminJson: string };
  chunking: { maxTokens: number; overlapTokens: number };
  retrieval: { topK: number; finalK: number; minScore: number };
  appUrl: string;
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;
  _config = {
    jina: {
      apiKey: required("JINA_API_KEY"),
      model: optional("JINA_EMBED_MODEL", "jina-embeddings-v3"),
      dimensions: parseInt(optional("JINA_EMBED_DIM", "768"), 10),
    },
    groq: {
      apiKey: required("GROQ_API_KEY"),
      model: optional("GROQ_MODEL", "llama-3.1-8b-instant"),
    },
    pinecone: {
      apiKey: required("PINECONE_API_KEY"),
      indexName: required("PINECONE_INDEX_NAME"),
    },
    firebase: { adminJson: required("FIREBASE_ADMIN_SDK_JSON") },
    chunking: { maxTokens: 512, overlapTokens: 64 },
    retrieval: { topK: 12, finalK: 4, minScore: 0.3 },
    appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  };
  return _config;
}
