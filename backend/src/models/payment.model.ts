import mongoose from 'mongoose';

// Credit packages: 20 = $20 USD, 40 = $40 USD
export type CreditPackage = '20' | '40';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';
export type PaymentMethod = 'sepay';

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  userId: string;
  discordId?: string;
  username?: string;
  package: CreditPackage;
  credits: number;
  amount: number;
  currency: 'VND';
  orderCode?: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  sepayTransactionId?: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

// Credit packages: price in VND, credits in USD, validity in days, referral bonus in USD
export const PACKAGE_CONFIG: Record<CreditPackage, { amount: number; credits: number; days: number; refBonus: number }> = {
  '20': { amount: 20000, credits: 20, days: 7, refBonus: 10 },
  '40': { amount: 40000, credits: 40, days: 7, refBonus: 20 },
};

const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  discordId: { type: String },
  username: { type: String },
  package: { type: String, enum: ['20', '40'], required: true },
  credits: { type: Number, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['VND'], default: 'VND' },
  orderCode: { type: String, sparse: true, index: true },
  paymentMethod: { type: String, enum: ['sepay'], default: 'sepay' },
  status: { type: String, enum: ['pending', 'success', 'failed', 'expired'], default: 'pending' },
  sepayTransactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date },
});

paymentSchema.index({ status: 1, expiresAt: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema, 'payments');

export function generateOrderCode(pkg: CreditPackage): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TROLL${pkg}USD${timestamp}${random}`;
}

export function generateQRCodeUrl(orderCode: string, amount: number, username?: string): string {
  const account = process.env.SEPAY_ACCOUNT || 'VQRQAFRBD3142';
  const bank = process.env.SEPAY_BANK || 'MBBank';
  const description = username ? `${orderCode} ${username}` : orderCode;
  return `https://qr.sepay.vn/img?acc=${account}&bank=${bank}&amount=${amount}&des=${encodeURIComponent(description)}`;
}
