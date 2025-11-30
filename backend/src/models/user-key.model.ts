import mongoose from 'mongoose';

export interface IUserKey {
  _id: string;
  name: string;
  tier: 'dev' | 'pro';
  tokensUsed: number;
  requestsCount: number;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  notes?: string;
  planExpiresAt?: Date | null;
}

const userKeySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  tier: { type: String, enum: ['dev', 'pro'], default: 'dev' },
  tokensUsed: { type: Number, default: 0 },
  requestsCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
  notes: { type: String },
  planExpiresAt: { type: Date, default: null },
});

userKeySchema.set('toJSON', { virtuals: true });
userKeySchema.set('toObject', { virtuals: true });

export const UserKey = mongoose.model<IUserKey>('UserKey', userKeySchema, 'user_keys');
