export interface EmbedKey {
  id: string;
  botId: string;
  publicKey: string;
  createdAt: number;
  rotatedAt?: number;
  revoked: boolean;
}

export function generatePublicKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pk_live_${hex}`;
}
