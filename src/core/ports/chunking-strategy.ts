import type { Chunk, StructureHint } from "@core/domain/chunk";
import type { SourceKind } from "@core/domain/document";

export interface ChunkInput {
  text: string;
  structure?: StructureHint[];
  sourceKind: SourceKind;
}

export interface ChunkingConfig {
  strategy: "recursive" | "structure" | "semantic";
  maxTokens: number;
  overlapTokens: number;
}

export interface ChunkingStrategy {
  readonly name: "recursive" | "structure" | "semantic";
  chunk(input: ChunkInput, cfg: ChunkingConfig): Promise<Chunk[]>;
}
