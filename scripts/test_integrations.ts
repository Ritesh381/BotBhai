/**
 * Smoke-tests the external integrations: Jina embeddings, Pinecone, and Groq.
 * Run with:  npx tsx scripts/test_integrations.ts
 * Requires a populated .env (loaded below).
 */
import { config as loadEnv } from "dotenv";
loadEnv();

async function testJina() {
  const res = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.JINA_EMBED_MODEL || "jina-embeddings-v3",
      task: "retrieval.query",
      dimensions: parseInt(process.env.JINA_EMBED_DIM || "768", 10),
      input: ["hello world"],
    }),
  });
  if (!res.ok) throw new Error(`Jina ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const dim = json.data[0].embedding.length;
  console.log(`✅ Jina OK — embedding dimension: ${dim}`);
  if (dim !== parseInt(process.env.JINA_EMBED_DIM || "768", 10)) {
    console.warn(`⚠️  Dimension mismatch vs Pinecone index expectation.`);
  }
}

async function testGroq() {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "Reply with the single word: pong" }],
      max_tokens: 5,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const json = await res.json();
  console.log(`✅ Groq OK — reply: "${json.choices[0].message.content.trim()}"`);
}

async function testPinecone() {
  const { Pinecone } = await import("@pinecone-database/pinecone");
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const name = process.env.PINECONE_INDEX_NAME!;
  const desc = await pc.describeIndex(name);
  console.log(
    `✅ Pinecone OK — index "${name}" dim=${desc.dimension} metric=${desc.metric}`
  );
}

async function main() {
  const checks: [string, () => Promise<void>][] = [
    ["Jina", testJina],
    ["Groq", testGroq],
    ["Pinecone", testPinecone],
  ];
  let failed = 0;
  for (const [name, fn] of checks) {
    try {
      await fn();
    } catch (err) {
      failed++;
      console.error(`❌ ${name} failed:`, err instanceof Error ? err.message : err);
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
