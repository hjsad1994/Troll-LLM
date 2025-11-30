import mongoose from 'mongoose';

export interface IUserKey {
  _id: string;
  name: string;
  tier: 'dev' | 'pro';
  totalTokens: number;
  tokensUsed: number;
  requestsCount: number;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  notes?: string;
  planExpiresAt?: Date | null;
  tokensRemaining?: number;
  usagePercent?: number;
  isExhausted?: boolean;
}

const userKeySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  tier: { type: String, enum: ['dev', 'pro'], default: 'dev' },
  totalTokens: { type: Number, default: 30000000 },
  tokensUsed: { type: Number, default: 0 },
  requestsCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
  notes: { type: String },
  planExpiresAt: { type: Date, default: null },
});

userKeySchema.virtual('tokensRemaining').get(function() {
  return Math.max(0, this.totalTokens - this.tokensUsed);
});

userKeySchema.virtual('usagePercent').get(function() {
  if (this.totalTokens === 0) return 0;
  return (this.tokensUsed / this.totalTokens) * 100;
});

userKeySchema.virtual('isExhausted').get(function() {
  return this.tokensUsed >= this.totalTokens;
});

userKeySchema.set('toJSON', { virtuals: true });
userKeySchema.set('toObject', { virtuals: true });

export const UserKey = mongoose.model<IUserKey>('UserKey', userKeySchema, 'user_keys');
