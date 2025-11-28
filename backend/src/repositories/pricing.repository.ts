import { ModelPricing, IModelPricing, DEFAULT_MODEL_PRICING } from '../models/model-pricing.model.js';
import { nanoid } from 'nanoid';

export class PricingRepository {
  async findAll(): Promise<IModelPricing[]> {
    return ModelPricing.find().sort({ displayName: 1 }).lean();
  }

  async findById(id: string): Promise<IModelPricing | null> {
    return ModelPricing.findById(id).lean();
  }

  async findByModelId(modelId: string): Promise<IModelPricing | null> {
    return ModelPricing.findOne({ modelId }).lean();
  }

  async findActive(): Promise<IModelPricing[]> {
    return ModelPricing.find({ isActive: true }).lean();
  }

  async create(data: {
    modelId: string;
    displayName: string;
    inputPricePerMTok: number;
    outputPricePerMTok: number;
    isActive?: boolean;
  }): Promise<IModelPricing> {
    const pricing = await ModelPricing.create({
      _id: nanoid(),
      ...data,
    });
    return pricing.toObject();
  }

  async update(id: string, data: Partial<{
    displayName: string;
    inputPricePerMTok: number;
    outputPricePerMTok: number;
    isActive: boolean;
  }>): Promise<IModelPricing | null> {
    return ModelPricing.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).lean();
  }

  async updateByModelId(modelId: string, data: Partial<{
    displayName: string;
    inputPricePerMTok: number;
    outputPricePerMTok: number;
    isActive: boolean;
  }>): Promise<IModelPricing | null> {
    return ModelPricing.findOneAndUpdate(
      { modelId },
      { ...data, updatedAt: new Date() },
      { new: true }
    ).lean();
  }

  async delete(id: string): Promise<boolean> {
    const result = await ModelPricing.findByIdAndDelete(id);
    return !!result;
  }

  async seedDefaults(): Promise<void> {
    const existingCount = await ModelPricing.countDocuments();
    if (existingCount === 0) {
      for (const pricing of DEFAULT_MODEL_PRICING) {
        await this.create(pricing);
      }
      console.log(`Seeded ${DEFAULT_MODEL_PRICING.length} default model pricing entries`);
    }
  }

  async getStats(): Promise<{ total: number; active: number }> {
    const all = await ModelPricing.find().lean();
    return {
      total: all.length,
      active: all.filter(p => p.isActive).length,
    };
  }
}

export const pricingRepository = new PricingRepository();
