import { Payment, IPayment, PaymentPlan, PaymentStatus, PaymentMethod } from '../models/payment.model.js';

export class PaymentRepository {
  async create(data: {
    userId: string;
    discordId?: string;
    plan: PaymentPlan;
    amount: number;
    orderCode: string;
    expiresAt: Date;
  }): Promise<IPayment> {
    const payment = await Payment.create({
      userId: data.userId,
      discordId: data.discordId,
      plan: data.plan,
      amount: data.amount,
      currency: 'VND',
      orderCode: data.orderCode,
      paymentMethod: 'sepay',
      status: 'pending',
      expiresAt: data.expiresAt,
    });
    return payment.toObject();
  }

  async createPayPal(data: {
    userId: string;
    discordId?: string;
    plan: PaymentPlan;
    amount: number;
    paypalOrderId: string;
    expiresAt: Date;
  }): Promise<IPayment> {
    const orderCode = `PAYPAL${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const payment = await Payment.create({
      userId: data.userId,
      discordId: data.discordId,
      plan: data.plan,
      amount: data.amount,
      currency: 'USD',
      orderCode,
      paypalOrderId: data.paypalOrderId,
      paymentMethod: 'paypal',
      status: 'pending',
      expiresAt: data.expiresAt,
    });
    return payment.toObject();
  }

  async findById(id: string): Promise<IPayment | null> {
    return Payment.findById(id).lean();
  }

  async findByOrderCode(orderCode: string): Promise<IPayment | null> {
    return Payment.findOne({ orderCode }).lean();
  }

  async findByPayPalOrderId(paypalOrderId: string): Promise<IPayment | null> {
    return Payment.findOne({ paypalOrderId }).lean();
  }

  async findPendingByOrderCodePattern(pattern: string): Promise<IPayment | null> {
    return Payment.findOne({
      orderCode: { $regex: pattern, $options: 'i' },
      status: 'pending',
    }).lean();
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string,
    paymentMethod: PaymentMethod = 'sepay'
  ): Promise<IPayment | null> {
    const update: any = { status };
    if (status === 'success') {
      update.completedAt = new Date();
    }
    if (transactionId) {
      if (paymentMethod === 'paypal') {
        update.paypalCaptureId = transactionId;
      } else {
        update.sepayTransactionId = transactionId;
      }
    }
    return Payment.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  async markExpired(id: string): Promise<IPayment | null> {
    return Payment.findByIdAndUpdate(
      id,
      { status: 'expired' },
      { new: true }
    ).lean();
  }

  async findByUserId(userId: string, limit: number = 20): Promise<IPayment[]> {
    return Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async checkAndExpire(paymentId: string): Promise<IPayment | null> {
    const payment = await Payment.findById(paymentId).lean();
    if (!payment) return null;
    
    if (payment.status === 'pending' && new Date() > payment.expiresAt) {
      return this.markExpired(paymentId);
    }
    return payment;
  }
}

export const paymentRepository = new PaymentRepository();
