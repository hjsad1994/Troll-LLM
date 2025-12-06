import { Payment, IPayment, PaymentPlan, PaymentStatus } from '../models/payment.model.js';

export class PaymentRepository {
  async create(data: {
    userId: string;
    discordId?: string;
    username?: string;
    plan: PaymentPlan;
    amount: number;
    orderCode: string;
    expiresAt: Date;
  }): Promise<IPayment> {
    const payment = await Payment.create({
      userId: data.userId,
      discordId: data.discordId,
      username: data.username,
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

  async findById(id: string): Promise<IPayment | null> {
    return Payment.findById(id).lean();
  }

  async findByOrderCode(orderCode: string): Promise<IPayment | null> {
    return Payment.findOne({ orderCode }).lean();
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
    transactionId?: string
  ): Promise<IPayment | null> {
    const update: any = { status };
    if (status === 'success') {
      update.completedAt = new Date();
    }
    if (transactionId) {
      update.sepayTransactionId = transactionId;
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

  async getAllPayments(options: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    since?: Date;
  } = {}): Promise<{ payments: IPayment[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, status, since } = options;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (since) {
      query.createdAt = { $gte: since };
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return {
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPaymentStats(since?: Date): Promise<{
    totalAmount: number;
    successCount: number;
    pendingCount: number;
    failedCount: number;
  }> {
    const query: any = {};
    if (since) {
      query.createdAt = { $gte: since };
    }

    const [stats] = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] }
          },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'expired']] }, 1, 0] }
          },
        },
      },
    ]);

    return stats || { totalAmount: 0, successCount: 0, pendingCount: 0, failedCount: 0 };
  }
}

export const paymentRepository = new PaymentRepository();
