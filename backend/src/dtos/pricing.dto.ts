import { z } from 'zod';

export const CreateModelPricingDTO = z.object({
  modelId: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  inputPricePerMTok: z.number().min(0),
  outputPricePerMTok: z.number().min(0),
  isActive: z.boolean().optional().default(true),
});

export const UpdateModelPricingDTO = z.object({
  displayName: z.string().min(1).max(100).optional(),
  inputPricePerMTok: z.number().min(0).optional(),
  outputPricePerMTok: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateModelPricingInput = z.infer<typeof CreateModelPricingDTO>;
export type UpdateModelPricingInput = z.infer<typeof UpdateModelPricingDTO>;

export interface ModelPricingResponse {
  id: string;
  modelId: string;
  displayName: string;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelPricingListResponse {
  total: number;
  pricing: ModelPricingResponse[];
}
