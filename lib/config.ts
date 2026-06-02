// Centralized server-side configuration & limits.
// Reading from process.env in one place makes missing keys easy to spot.

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.startsWith("REPLACE_ME")) {
    throw new Error(
      `Missing required env var: ${name}. Add it to your .env file.`
    );
  }
  return v;
}

export const config = {
  jina: {
    apiKey: () => required("JINA_API_KEY"),
    model: process.env.JINA_EMBED_MODEL || "jina-embeddings-v3",
    dimensions: parseInt(process.env.JINA_EMBED_DIM || "768", 10),
  },
  groq: {
    apiKey: () => required("GROQ_API_KEY"),
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  },
  pinecone: {
    apiKey: () => required("PINECONE_API_KEY"),
    indexName: () => required("PINECONE_INDEX_NAME"),
  },
  firebaseAdminJson: () => required("FIREBASE_ADMIN_SDK_JSON"),

  // ── Chunking ──
  chunk: {
    size: 1000, // target characters per chunk
    overlap: 150,
  },

  // ── Retrieval ──
  retrieval: {
    topK: 5,
    minScore: 0.35, // below this for the best chunk => treat as "missing answer"
  },

  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};
