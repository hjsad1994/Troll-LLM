import { z } from 'zod';

export const CreateFactoryKeyDTO = z.object({
  id: z.string().min(1).max(50),
  apiKey: z.string().min(1),
});

export type CreateFactoryKeyInput = z.infer<typeof CreateFactoryKeyDTO>;

export interface FactoryKeyResponse {
  id: string;
  status: string;
  tokensUsed: number;
  requestsCount: number;
  lastError?: string;
  cooldownUntil?: string;
  createdAt: string;
}

export interface FactoryKeyStatsResponse {
  total: number;
  healthy: number;
  unhealthy: number;
  keys: FactoryKeyResponse[];
}
