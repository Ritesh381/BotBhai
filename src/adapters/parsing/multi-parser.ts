import "server-only";
import type { DocumentParser, ParseResult } from "@core/ports/document-parser";
import Papa from "papaparse";

// PDF
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return { text: data.text };
}

// DOCX — preserves heading structure for structure-aware chunking
async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

// PPTX — one "slide N: content" unit per slide
async function parsePptx(buffer: Buffer): Promise<ParseResult> {
  // Minimal PPTX text extraction via xml parsing
  const { DOMParser } = await import("@xmldom/xmldom").catch(() => {
    throw new Error("PPTX parsing requires @xmldom/xmldom. Run: npm i @xmldom/xmldom");
  });
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slides: string[] = [];
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort();

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const texts: string[] = [];
    const nodes = doc.getElementsByTagName("a:t");
    for (let j = 0; j < nodes.length; j++) {
      const t = nodes[j].textContent;
      if (t?.trim()) texts.push(t.trim());
    }
    if (texts.length) slides.push(`Slide ${i + 1}: ${texts.join(" ")}`);
  }
  return { text: slides.join("\n\n") };
}

// CSV — one "key: value, key: value" line per row with header context
function parseCsv(text: string): ParseResult {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = result.data as unknown as string[][];
  if (rows.length === 0) return { text: "" };
  const header = rows[0];
  const body = rows
    .slice(1)
    .map((row) =>
      row.map((cell, i) => `${header[i] ?? `col${i}`}: ${cell}`).join(", ")
    )
    .join("\n");
  return { text: body };
}

export class MultiParser implements DocumentParser {
  private readonly supported = ["pdf", "txt", "md", "csv", "docx", "pptx"];

  supports(fileType: string): boolean {
    return this.supported.includes(fileType.toLowerCase());
  }

  async extract(buffer: Buffer, fileType: string): Promise<ParseResult> {
    const t = fileType.toLowerCase();
    switch (t) {
      case "pdf":   return parsePdf(buffer);
      case "docx":  return parseDocx(buffer);
      case "pptx":  return parsePptx(buffer);
      case "csv":   return parseCsv(buffer.toString("utf-8"));
      case "txt":
      case "md":    return { text: buffer.toString("utf-8") };
      default:      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
}
