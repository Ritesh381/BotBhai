export type ResponseTone = "professional" | "friendly" | "humorous";

export interface BotPersona {
  systemInstructions: string;
  tone: ResponseTone;
  welcome: string;
  fallback: string;
  starterQuestions: string[];
}

export interface WidgetConfig {
  primaryColor: string;
  position: "bottom-right" | "bottom-left";
  avatarUrl?: string;
  greeting: string;
  showPoweredBy: boolean;
  leadCapture: {
    enabled: boolean;
    trigger: "handoff" | "low-confidence" | "after-turns";
    triggerAfterTurns?: number;
    fields: ("name" | "email" | "phone")[];
  };
}

export interface RetrievalConfig {
  topK: number;
  finalK: number;
  minScore: number;
  rerank: boolean;
  rewriteHistory: boolean;
}

export interface ModelConfig {
  provider: "groq";
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface Bot {
  id: string;
  ownerId: string;
  name: string;
  persona: BotPersona;
  widgetConfig: WidgetConfig;
  retrievalConfig: RetrievalConfig;
  modelConfig: ModelConfig;
  allowedOrigins: string[];
  createdAt: number;
  updatedAt: number;
}

export type BotEditableFields = Pick<Bot,
  "name" | "persona" | "widgetConfig" | "retrievalConfig" | "modelConfig" | "allowedOrigins"
>;

export function defaultPersona(): BotPersona {
  return {
    systemInstructions: "You are a helpful assistant. Answer questions based on the provided knowledge base.",
    tone: "professional",
    welcome: "Hi! How can I help you today?",
    fallback: "I'm sorry, I don't have enough information to answer that yet.",
    starterQuestions: [],
  };
}

export function defaultWidgetConfig(): WidgetConfig {
  return {
    primaryColor: "#4f46e5",
    position: "bottom-right",
    greeting: "Chat with us",
    showPoweredBy: true,
    leadCapture: { enabled: false, trigger: "handoff", fields: ["email"] },
  };
}

export function defaultRetrievalConfig(): RetrievalConfig {
  return { topK: 12, finalK: 4, minScore: 0.3, rerank: true, rewriteHistory: false };
}

export function defaultModelConfig(model: string): ModelConfig {
  return { provider: "groq", model, temperature: 0.2, maxTokens: 700 };
}
