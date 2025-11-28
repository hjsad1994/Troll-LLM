import { pricingRepository } from '../repositories/pricing.repository.js';
import { IModelPricing } from '../models/model-pricing.model.js';

export async function listModelPricing(): Promise<IModelPricing[]> {
  return pricingRepository.findAll();
}

export async function getModelPricing(id: string): Promise<IModelPricing | null> {
  return pricingRepository.findById(id);
}

export async function getModelPricingByModelId(modelId: string): Promise<IModelPricing | null> {
  return pricingRepository.findByModelId(modelId);
}

export async function getActivePricing(): Promise<IModelPricing[]> {
  return pricingRepository.findActive();
}

export async function createModelPricing(data: {
  modelId: string;
  displayName: string;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  isActive?: boolean;
}): Promise<IModelPricing> {
  const existing = await pricingRepository.findByModelId(data.modelId);
  if (existing) {
    throw new Error(`Model pricing for ${data.modelId} already exists`);
  }
  return pricingRepository.create(data);
}

export async function updateModelPricing(id: string, data: Partial<{
  displayName: string;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  isActive: boolean;
}>): Promise<IModelPricing | null> {
  return pricingRepository.update(id, data);
}

export async function updateModelPricingByModelId(modelId: string, data: Partial<{
  displayName: string;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  isActive: boolean;
}>): Promise<IModelPricing | null> {
  return pricingRepository.updateByModelId(modelId, data);
}

export async function deleteModelPricing(id: string): Promise<boolean> {
  return pricingRepository.delete(id);
}

export async function seedDefaultPricing(): Promise<void> {
  return pricingRepository.seedDefaults();
}

export async function getPricingStats(): Promise<{ total: number; active: number }> {
  return pricingRepository.getStats();
}

export function calculateBillingCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMTok: number,
  outputPricePerMTok: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const inputCost = (inputTokens / 1_000_000) * inputPricePerMTok;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMTok;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
