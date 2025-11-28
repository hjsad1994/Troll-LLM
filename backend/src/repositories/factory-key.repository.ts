import { FactoryKey, IFactoryKey } from '../models/factory-key.model.js';

export class FactoryKeyRepository {
  async findAll(): Promise<IFactoryKey[]> {
    return FactoryKey.find().sort({ createdAt: -1 }).lean();
  }

  async findById(id: string): Promise<IFactoryKey | null> {
    return FactoryKey.findById(id).lean();
  }

  async findHealthy(): Promise<IFactoryKey[]> {
    return FactoryKey.find({ status: 'healthy' }).lean();
  }

  async create(id: string, apiKey: string): Promise<IFactoryKey> {
    const key = await FactoryKey.create({
      _id: id,
      apiKey,
      status: 'healthy',
    });
    return key.toObject();
  }

  async delete(id: string): Promise<boolean> {
    const result = await FactoryKey.findByIdAndDelete(id);
    return !!result;
  }

  async updateStatus(id: string, status: IFactoryKey['status'], lastError?: string): Promise<IFactoryKey | null> {
    const update: any = { status };
    if (lastError !== undefined) update.lastError = lastError;
    return FactoryKey.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  async resetStatus(id: string): Promise<IFactoryKey | null> {
    return FactoryKey.findByIdAndUpdate(
      id,
      { 
        status: 'healthy', 
        lastError: null, 
        cooldownUntil: null,
        tokensUsed: 0,
        requestsCount: 0
      },
      { new: true }
    ).lean();
  }

  async getStats(): Promise<{ total: number; healthy: number; unhealthy: number }> {
    const keys = await FactoryKey.find().lean();
    const total = keys.length;
    const healthy = keys.filter(k => k.status === 'healthy').length;
    const unhealthy = total - healthy;
    return { total, healthy, unhealthy };
  }
}

export const factoryKeyRepository = new FactoryKeyRepository();
