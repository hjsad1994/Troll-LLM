import mongoose from 'mongoose';

export type PaymentPlan = 'dev' | 'pro';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  userId: string;
  discordId?: string;
  plan: PaymentPlan;
  amount: number;
  currency: 'VND';
  orderCode: string;
  status: PaymentStatus;
  sepayTransactionId?: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export const PLAN_PRICES: Record<PaymentPlan, { amount: number; credits: number }> = {
  dev: { amount: 35000, credits: 225 },
  pro: { amount: 79000, credits: 500 },
};

const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  discordId: { type: String },
  plan: { type: String, enum: ['dev', 'pro'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'VND' },
  orderCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'success', 'failed', 'expired'], default: 'pending' },
  sepayTransactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date },
});

paymentSchema.index({ status: 1, expiresAt: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema, 'payments');

export function generateOrderCode(plan: PaymentPlan): string {
  const planCode = plan.toUpperCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TROLL${planCode}${timestamp}${random}`;
}

export function generateQRCodeUrl(orderCode: string, amount: number): string {
  const account = process.env.SEPAY_ACCOUNT || 'VQRQAFRBD3142';
  const bank = process.env.SEPAY_BANK || 'MBBank';
  return `https://qr.sepay.vn/img?acc=${account}&bank=${bank}&amount=${amount}&des=${orderCode}`;
}
