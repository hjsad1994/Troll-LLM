import { customAlphabet } from 'nanoid';
import { UserKey } from '../db/mongodb.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 32);

export interface CreateKeyInput {
  name: string;
  tier: 'dev' | 'pro';
  totalTokens?: number;
  notes?: string;
}

export interface UpdateKeyInput {
  totalTokens?: number;
  notes?: string;
  isActive?: boolean;
}

export async function createUserKey(input: CreateKeyInput) {
  const keyId = `sk-${input.tier}-${nanoid()}`;
  const defaultTokens = 30000000; // 30M

  const userKey = new UserKey({
    _id: keyId,
    name: input.name,
    tier: input.tier,
    totalTokens: input.totalTokens || defaultTokens,
    notes: input.notes,
  });

  await userKey.save();
  return userKey.toJSON();
}

export async function listUserKeys() {
  const keys = await UserKey.find().sort({ createdAt: -1 });
  return keys.map(k => k.toJSON());
}

export async function getUserKey(keyId: string) {
  const key = await UserKey.findById(keyId);
  return key ? key.toJSON() : null;
}

export async function updateUserKey(keyId: string, input: UpdateKeyInput) {
  const updateData: Record<string, unknown> = {};
  
  if (input.totalTokens !== undefined) {
    updateData.totalTokens = input.totalTokens;
  }
  if (input.notes !== undefined) {
    updateData.notes = input.notes;
  }
  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
  }

  const key = await UserKey.findByIdAndUpdate(
    keyId,
    { $set: updateData },
    { new: true }
  );

  return key ? key.toJSON() : null;
}

export async function revokeUserKey(keyId: string) {
  const key = await UserKey.findByIdAndUpdate(
    keyId,
    { $set: { isActive: false } },
    { new: true }
  );

  return key ? key.toJSON() : null;
}

export async function deleteUserKey(keyId: string) {
  const key = await UserKey.findByIdAndDelete(keyId);
  return key ? key.toJSON() : null;
}

export async function resetUserKeyUsage(keyId: string) {
  const key = await UserKey.findByIdAndUpdate(
    keyId,
    { $set: { tokensUsed: 0, requestsCount: 0 } },
    { new: true }
  );

  return key ? key.toJSON() : null;
}

export async function getKeyStats() {
  const total = await UserKey.countDocuments();
  const active = await UserKey.countDocuments({ isActive: true });
  const exhausted = await UserKey.countDocuments({
    isActive: true,
    $expr: { $gte: ['$tokensUsed', '$totalTokens'] }
  });

  return { total, active, exhausted };
}

export function maskKey(key: string): string {
  if (key.length < 10) return '***';
  return key.substring(0, 7) + '***' + key.substring(key.length - 3);
}
