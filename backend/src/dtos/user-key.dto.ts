import { z } from 'zod';

export const CreateUserKeyDTO = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(['dev', 'pro']),
  totalTokens: z.number().int().min(1000000).max(100000000).optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateUserKeyDTO = z.object({
  totalTokens: z.number().int().min(1000000).max(100000000).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserKeyInput = z.infer<typeof CreateUserKeyDTO>;
export type UpdateUserKeyInput = z.infer<typeof UpdateUserKeyDTO>;

export interface UserKeyResponse {
  id: string;
  name: string;
  tier: string;
  totalTokens: number;
  tokensUsed: number;
  tokensRemaining: number;
  usagePercent: number;
  isExhausted: boolean;
  isActive: boolean;
  requestsCount: number;
  createdAt: string;
  lastUsedAt?: string;
  notes?: string;
}
