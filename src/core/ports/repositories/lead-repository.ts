import type { Lead } from "@core/domain/lead";

export interface LeadRepository {
  create(lead: Lead): Promise<Lead>;
  listByBot(botId: string, limit?: number): Promise<Lead[]>;
}
