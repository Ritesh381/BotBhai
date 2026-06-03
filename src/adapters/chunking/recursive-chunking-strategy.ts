import type { ChunkingStrategy, ChunkInput, ChunkingConfig } from "@core/ports/chunking-strategy";
import type { Chunk } from "@core/domain/chunk";

const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

function cleanText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// Rough token estimate: 1 token ≈ 4 chars (good enough without a full tokenizer)
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitRecursive(text: string, maxTokens: number): string[] {
  if (approxTokens(text) <= maxTokens) return [text];
  const maxChars = maxTokens * 4;

  for (const sep of SEPARATORS) {
    if (sep === "") break;
    const parts = text.split(sep);
    if (parts.length === 1) continue;

    const chunks: string[] = [];
    let current = "";
    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (approxTokens(candidate) > maxTokens && current) {
        chunks.push(current);
        current = part;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);

    return chunks.flatMap((c) =>
      approxTokens(c) > maxTokens ? splitRecursive(c, maxTokens) : [c]
    );
  }

  // Hard split fallback
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

function withOverlap(chunks: string[], overlapTokens: number): string[] {
  const overlapChars = overlapTokens * 4;
  if (overlapChars <= 0 || chunks.length <= 1) return chunks;
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = chunks[i - 1];
    const tail = prev.slice(Math.max(0, prev.length - overlapChars));
    return `${tail} ${chunk}`.trim();
  });
}

export class RecursiveChunkingStrategy implements ChunkingStrategy {
  readonly name = "recursive" as const;

  async chunk(input: ChunkInput, cfg: ChunkingConfig): Promise<Chunk[]> {
    const cleaned = cleanText(input.text);
    if (!cleaned) return [];
    const base = splitRecursive(cleaned, cfg.maxTokens);
    const overlapped = withOverlap(base, cfg.overlapTokens);
    return overlapped
      .filter((t) => t.trim().length > 0)
      .map((text, index) => ({ text, index }));
  }
}
