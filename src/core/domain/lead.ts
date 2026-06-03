export interface Lead {
  id: string;
  botId: string;
  conversationId?: string;
  name?: string;
  email: string;
  phone?: string;
  meta?: Record<string, string>;
  createdAt: number;
}
