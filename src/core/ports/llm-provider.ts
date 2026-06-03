export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  costUsd?: number;
}

export interface CompletionRequest {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  complete(req: CompletionRequest): Promise<{ text: string; usage: TokenUsage }>;
  stream(req: CompletionRequest): AsyncIterable<string>;
}
