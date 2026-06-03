import type { StructureHint } from "@core/domain/chunk";

export interface ParseResult {
  text: string;
  structure?: StructureHint[];
}

export interface DocumentParser {
  supports(fileType: string): boolean;
  extract(buffer: Buffer, fileType: string): Promise<ParseResult>;
}
