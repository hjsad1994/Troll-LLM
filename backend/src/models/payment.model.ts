import mongoose from 'mongoose';

// Credit amount: any integer from 20 to 100 USD
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';
export type PaymentMethod = 'sepay';

// Constants for credit purchases
export const MIN_CREDITS = 20;
export const MAX_CREDITS = 200;

// Bonus tier: 10% bonus for purchases >= $100
export const BONUS_THRESHOLD = 100;
export const BONUS_PERCENT = 10;

export function calculateTierBonus(credits: number): number {
  if (credits >= BONUS_THRESHOLD) {
    return Math.floor(credits * BONUS_PERCENT / 100);
  }
  return 0;
}

export function calculateTotalCredits(credits: number): number {
  return credits + calculateTierBonus(credits);
}
export const VND_RATE = 1000; // 1000 VND = $1
export const VALIDITY_DAYS = 7;

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  userId: string;
  discordId?: string;
  username?: string;
  credits: number;
  amount: number;
  currency: 'VND';
  orderCode?: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  sepayTransactionId?: string;
  creditsBefore?: number;
  creditsAfter?: number;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

// Helper to calculate referral bonus (50% of credits, minimum $5)
export function calculateRefBonus(credits: number): number {
  return Math.max(5, Math.floor(credits * 0.5));
}

const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  discordId: { type: String },
  username: { type: String },
  credits: { type: Number, required: true, min: MIN_CREDITS, max: MAX_CREDITS },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['VND'], default: 'VND' },
  orderCode: { type: String, sparse: true, index: true },
  paymentMethod: { type: String, enum: ['sepay'], default: 'sepay' },
  status: { type: String, enum: ['pending', 'success', 'failed', 'expired'], default: 'pending' },
  sepayTransactionId: { type: String },
  creditsBefore: { type: Number },
  creditsAfter: { type: Number },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date },
});

paymentSchema.index({ status: 1, expiresAt: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema, 'payments');

export function generateOrderCode(credits: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TROLL${credits}D${timestamp}${random}`;
}

export function generateQRCodeUrl(orderCode: string, amount: number, username?: string): string {
  const account = process.env.SEPAY_ACCOUNT || 'VQRQAFRBD3142';
  const bank = process.env.SEPAY_BANK || 'MBBank';
  const description = username ? `${orderCode} ${username}` : orderCode;
  return `https://qr.sepay.vn/img?acc=${account}&bank=${bank}&amount=${amount}&des=${encodeURIComponent(description)}`;
}
