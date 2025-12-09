import mongoose from 'mongoose';
// Re-export helper functions from user.model.ts to avoid duplication
export {
  hashPassword,
  verifyPassword,
  generateApiKey,
  maskApiKey,
  generateReferralCode,
  maskUsername,
  CreditPackage,
  CREDIT_PACKAGES,
} from './user.model.js';

export interface IUserNew {
  _id: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  apiKey: string;
  apiKeyCreatedAt: Date;
  // Credits-based billing (USD)
  credits: number;           // Credits remaining (USD)
  creditsUsed: number;       // Credits used (lifetime, USD)
  totalInputTokens: number;  // Input tokens used (for analytics)
  totalOutputTokens: number; // Output tokens used (for analytics)
  purchasedAt?: Date | null; // When credits were purchased
  expiresAt?: Date | null;   // When credits expire (7 days from purchase)
  // Referral fields
  referralCode: string;
  referredBy?: string | null;
  refCredits: number;        // Referral credits (bonus, USD)
  referralBonusAwarded: boolean;
}

const userNewSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  apiKey: { type: String, unique: true, sparse: true },
  apiKeyCreatedAt: { type: Date },
  // Credits-based billing (USD)
  credits: { type: Number, default: 0 },
  creditsUsed: { type: Number, default: 0 },
  totalInputTokens: { type: Number, default: 0 },
  totalOutputTokens: { type: Number, default: 0 },
  purchasedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  // Referral fields
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  refCredits: { type: Number, default: 0 },
  referralBonusAwarded: { type: Boolean, default: false },
});

export const UserNew = mongoose.model<IUserNew>('UserNew', userNewSchema, 'usersNew');
