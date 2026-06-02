import { config } from "@/lib/config";

// Collapse excessive whitespace while keeping paragraph boundaries.
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Recursive character splitter: tries to break on the largest natural
// separator that keeps chunks under `size`, falling back to smaller ones.
const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

function splitRecursive(text: string, size: number): string[] {
  if (text.length <= size) return [text];

  for (const sep of SEPARATORS) {
    if (sep === "") break;
    const parts = text.split(sep);
    if (parts.length === 1) continue;

    const chunks: string[] = [];
    let current = "";
    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (candidate.length > size && current) {
        chunks.push(current);
        current = part;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);

    // Any oversized piece (e.g. one huge paragraph) is split further.
    return chunks.flatMap((c) =>
      c.length > size ? splitRecursive(c, size) : [c]
    );
  }

  // No separator helped — hard-split by character.
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Adds overlap between consecutive chunks for better retrieval continuity.
function withOverlap(chunks: string[], overlap: number): string[] {
  if (overlap <= 0 || chunks.length <= 1) return chunks;
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = chunks[i - 1];
    const tail = prev.slice(Math.max(0, prev.length - overlap));
    return `${tail} ${chunk}`.trim();
  });
}

export function chunkText(raw: string): string[] {
  const cleaned = cleanText(raw);
  if (!cleaned) return [];
  const base = splitRecursive(cleaned, config.chunk.size);
  return withOverlap(base, config.chunk.overlap).filter((c) => c.trim().length > 0);
}
