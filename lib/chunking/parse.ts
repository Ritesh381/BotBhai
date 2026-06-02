import "server-only";

import Papa from "papaparse";

export const SUPPORTED_TYPES = ["pdf", "txt", "md", "csv"] as const;
export type SupportedType = (typeof SUPPORTED_TYPES)[number];

export function getFileType(filename: string): SupportedType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_TYPES.includes(ext as SupportedType)
    ? (ext as SupportedType)
    : null;
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // pdf-parse pulls in test fixtures at top-level import, so require lazily.
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

function parseCsv(text: string): string {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  // Flatten rows into readable "col: val" lines so chunks carry context.
  const rows = result.data as unknown as string[][];
  if (rows.length === 0) return "";
  const header = rows[0];
  return rows
    .slice(1)
    .map((row) =>
      row.map((cell, i) => `${header[i] ?? `col${i}`}: ${cell}`).join(", ")
    )
    .join("\n");
}

// Extract plain text from an uploaded file buffer based on its type.
export async function extractText(
  buffer: Buffer,
  type: SupportedType
): Promise<string> {
  switch (type) {
    case "pdf":
      return parsePdf(buffer);
    case "csv":
      return parseCsv(buffer.toString("utf-8"));
    case "txt":
    case "md":
      return buffer.toString("utf-8");
  }
}
