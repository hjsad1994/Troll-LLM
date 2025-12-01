import mongoose from 'mongoose';
import crypto from 'crypto';

export type UserPlan = 'free' | 'dev' | 'pro';

export interface IUser {
  _id: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  apiKey: string;
  apiKeyCreatedAt: Date;
  plan: UserPlan;
  planStartDate?: Date | null;
  planExpiresAt?: Date | null;
  tokensUsed: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  monthlyTokensUsed: number;
  monthlyResetDate: Date;
  credits: number;
}

export const PLAN_LIMITS: Record<UserPlan, { monthlyTokens: number; rpm: number; valueUsd: number }> = {
  free: { monthlyTokens: 0, rpm: 0, valueUsd: 0 },
  dev: { monthlyTokens: 15_000_000, rpm: 300, valueUsd: 225 },
  pro: { monthlyTokens: 40_000_000, rpm: 1000, valueUsd: 500 },
};

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  apiKey: { type: String, unique: true, sparse: true },
  apiKeyCreatedAt: { type: Date },
  plan: { type: String, enum: ['free', 'dev', 'pro'], default: 'free' },
  planStartDate: { type: Date, default: null },
  planExpiresAt: { type: Date, default: null },
  tokensUsed: { type: Number, default: 0 },
  totalInputTokens: { type: Number, default: 0 },
  totalOutputTokens: { type: Number, default: 0 },
  monthlyTokensUsed: { type: Number, default: 0 },
  monthlyResetDate: { type: Date, default: () => getFirstDayOfMonth() },
  credits: { type: Number, default: 0 },
});

function getFirstDayOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export const User = mongoose.model<IUser>('User', userSchema, 'users');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  const hexString = randomBytes.toString('hex');
  return `sk-trollllm-${hexString}`;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 20) return '****';
  return key.slice(0, 15) + '****' + key.slice(-4);
}
