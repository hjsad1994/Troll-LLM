import { FactoryKey, IFactoryKey } from '../models/factory-key.model.js';

// Safe factory key type that never exposes the full apiKey
export interface SafeFactoryKey {
  _id: string;
  maskedApiKey: string;
  status: 'healthy' | 'rate_limited' | 'exhausted' | 'error';
  tokensUsed: number;
  requestsCount: number;
  lastError?: string;
  cooldownUntil?: Date;
  createdAt: Date;
}

export class FactoryKeyRepository {
  // Mask API key to show only first 7 and last 3 characters
  private maskApiKey(key: string): string {
    if (!key || key.length < 10) return '***';
    return key.substring(0, 7) + '***' + key.substring(key.length - 3);
  }

  // Returns factory keys with masked apiKey - safe for API responses
  async findAll(): Promise<SafeFactoryKey[]> {
    const keys = await FactoryKey.find().sort({ createdAt: -1 }).lean();
    return keys.map(key => ({
      _id: key._id,
      maskedApiKey: this.maskApiKey(key.apiKey),
      status: key.status,
      tokensUsed: key.tokensUsed,
      requestsCount: key.requestsCount,
      lastError: key.lastError,
      cooldownUntil: key.cooldownUntil,
      createdAt: key.createdAt,
    }));
  }

  // Returns single factory key with masked apiKey - safe for API responses
  async findById(id: string): Promise<SafeFactoryKey | null> {
    const key = await FactoryKey.findById(id).lean();
    if (!key) return null;
    return {
      _id: key._id,
      maskedApiKey: this.maskApiKey(key.apiKey),
      status: key.status,
      tokensUsed: key.tokensUsed,
      requestsCount: key.requestsCount,
      lastError: key.lastError,
      cooldownUntil: key.cooldownUntil,
      createdAt: key.createdAt,
    };
  }

  // Internal use only - returns full apiKey for GoProxy
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
