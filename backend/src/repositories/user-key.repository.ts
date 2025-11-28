import { UserKey, IUserKey } from '../models/user-key.model.js';
import { CreateUserKeyInput, UpdateUserKeyInput } from '../dtos/user-key.dto.js';
import { nanoid } from 'nanoid';

export class UserKeyRepository {
  async findAll(): Promise<IUserKey[]> {
    return UserKey.find().sort({ createdAt: -1 }).lean();
  }

  async findById(id: string): Promise<IUserKey | null> {
    return UserKey.findById(id).lean();
  }

  async findActive(): Promise<IUserKey[]> {
    return UserKey.find({ isActive: true }).lean();
  }

  async create(data: CreateUserKeyInput): Promise<IUserKey> {
    const prefix = data.tier === 'pro' ? 'sk-pro-' : 'sk-dev-';
    const id = prefix + nanoid(24);
    
    const key = await UserKey.create({
      _id: id,
      name: data.name,
      tier: data.tier,
      totalTokens: data.totalTokens || 30000000,
      notes: data.notes,
    });
    return key.toObject();
  }

  async update(id: string, data: UpdateUserKeyInput): Promise<IUserKey | null> {
    return UserKey.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id: string): Promise<IUserKey | null> {
    return UserKey.findByIdAndDelete(id).lean();
  }

  async setActive(id: string, isActive: boolean): Promise<IUserKey | null> {
    return UserKey.findByIdAndUpdate(id, { isActive }, { new: true }).lean();
  }

  async resetUsage(id: string): Promise<IUserKey | null> {
    return UserKey.findByIdAndUpdate(
      id,
      { tokensUsed: 0, requestsCount: 0 },
      { new: true }
    ).lean();
  }

  async getStats(): Promise<{ total: number; active: number; exhausted: number }> {
    const keys = await UserKey.find().lean();
    const total = keys.length;
    const active = keys.filter(k => k.isActive).length;
    const exhausted = keys.filter(k => k.tokensUsed >= k.totalTokens).length;
    return { total, active, exhausted };
  }
}

export const userKeyRepository = new UserKeyRepository();
