import { paymentRepository } from '../repositories/payment.repository.js';
import { userRepository, calculatePlanExpiration } from '../repositories/user.repository.js';
import { 
  IPayment, 
  PaymentPlan, 
  PLAN_PRICES, 
  generateOrderCode, 
  generateQRCodeUrl 
} from '../models/payment.model.js';
import { UserKey } from '../models/user-key.model.js';

export interface CheckoutResult {
  paymentId: string;
  orderCode: string;
  qrCodeUrl: string;
  amount: number;
  plan: PaymentPlan;
  expiresAt: Date;
}

interface DiscordWebhookPayload {
  discordId: string;
  plan: string;
  username: string;
  orderCode: string;
  amount: number;
  transactionId: string;
}

export interface PaymentStatusResult {
  status: string;
  remainingSeconds: number;
  plan?: string;
  completedAt?: Date;
}

export interface SepayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
}

function extractOrderCode(text: string): string | null {
  // Try to find TROLLDEV or TROLLPRO pattern in the text
  const match = text.match(/TROLL(DEV|PRO)\d+[A-Z0-9]+/i);
  return match ? match[0].toUpperCase() : null;
}

export class PaymentService {
  async createCheckout(userId: string, plan: PaymentPlan, discordId?: string): Promise<CheckoutResult> {
    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) {
      throw new Error('Invalid plan');
    }

    // Validate Discord ID format (should be 17-19 digit number)
    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      throw new Error('Invalid Discord ID format. Please enter your Discord User ID (17-19 digits)');
    }

    const orderCode = generateOrderCode(plan);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const payment = await paymentRepository.create({
      userId,
      discordId,
      plan,
      amount: planConfig.amount,
      orderCode,
      expiresAt,
    });

    const qrCodeUrl = generateQRCodeUrl(orderCode, planConfig.amount);

    return {
      paymentId: payment._id.toString(),
      orderCode,
      qrCodeUrl,
      amount: planConfig.amount,
      plan,
      expiresAt,
    };
  }

  async getPaymentStatus(paymentId: string, userId: string): Promise<PaymentStatusResult | null> {
    const payment = await paymentRepository.checkAndExpire(paymentId);
    if (!payment || payment.userId !== userId) {
      return null;
    }

    const now = new Date();
    const remainingMs = payment.expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
      status: payment.status,
      remainingSeconds,
      plan: payment.status === 'success' ? payment.plan : undefined,
      completedAt: payment.completedAt,
    };
  }

  async processWebhook(payload: SepayWebhookPayload): Promise<{ processed: boolean; message: string }> {
    console.log('[Payment Webhook] Processing:', JSON.stringify(payload));
    
    // Validate transfer type
    if (payload.transferType !== 'in') {
      return { processed: false, message: 'Ignored: not incoming transfer' };
    }

    // Validate subAccount (virtual account identifier)
    const expectedAccount = process.env.SEPAY_ACCOUNT || 'VQRQAFRBD3142';
    // Check subAccount field (SePay uses this for virtual account)
    if (payload.subAccount !== expectedAccount) {
      console.log(`[Payment Webhook] Account check: subAccount=${payload.subAccount}, expected=${expectedAccount}`);
      return { processed: false, message: 'Ignored: account mismatch' };
    }

    // Extract order code from content or description
    const content = payload.content || '';
    const description = payload.description || '';
    
    let orderCode = extractOrderCode(content);
    if (!orderCode) {
      orderCode = extractOrderCode(description);
    }
    
    if (!orderCode) {
      console.log(`[Payment Webhook] Unmatched content: ${content}`);
      console.log(`[Payment Webhook] Unmatched description: ${description}`);
      return { processed: false, message: 'No matching order code found' };
    }

    console.log(`[Payment Webhook] Found orderCode: ${orderCode}`);
    const payment = await paymentRepository.findByOrderCode(orderCode);

    if (!payment) {
      console.log(`[Payment Webhook] Order code not found: ${orderCode}`);
      return { processed: false, message: 'Payment not found' };
    }

    // Check if already processed
    if (payment.status === 'success') {
      return { processed: false, message: 'Already processed' };
    }

    // Check if expired
    if (payment.status === 'expired') {
      return { processed: false, message: 'Payment expired' };
    }

    // Validate amount
    if (payload.transferAmount !== payment.amount) {
      console.log(`[Payment Webhook] Amount mismatch: expected ${payment.amount}, got ${payload.transferAmount}`);
      return { processed: false, message: 'Amount mismatch - logged for review' };
    }

    // Process successful payment
    await paymentRepository.updateStatus(
      payment._id.toString(),
      'success',
      payload.id.toString()
    );

    // Upgrade user plan
    await this.upgradePlan(payment.userId, payment.plan);

    // Send webhook to Discord bot if discordId exists
    if (payment.discordId) {
      await this.notifyDiscordBot({
        discordId: payment.discordId,
        plan: payment.plan,
        username: payment.userId,
        orderCode: payment.orderCode,
        amount: payment.amount,
        transactionId: payload.id.toString(),
      });
    }

    console.log(`[Payment Webhook] Success: ${orderCode} - User: ${payment.userId} - Plan: ${payment.plan}`);
    return { processed: true, message: 'Payment processed successfully' };
  }

  private async notifyDiscordBot(payload: DiscordWebhookPayload): Promise<void> {
    const webhookUrl = process.env.DISCORD_BOT_WEBHOOK_URL;
    const webhookSecret = process.env.DISCORD_BOT_WEBHOOK_SECRET;

    if (!webhookUrl) {
      console.log('[Discord Webhook] DISCORD_BOT_WEBHOOK_URL not configured, skipping');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': webhookSecret || '',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as { success?: boolean; error?: string };
      
      if (response.ok && result.success) {
        console.log(`[Discord Webhook] Role assigned for ${payload.discordId}: ${payload.plan}`);
      } else {
        console.error(`[Discord Webhook] Failed: ${result.error || response.statusText}`);
      }
    } catch (error) {
      console.error('[Discord Webhook] Error:', error);
    }
  }

  private async upgradePlan(userId: string, plan: PaymentPlan): Promise<void> {
    const user = await userRepository.getFullUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const planConfig = PLAN_PRICES[plan];
    const now = new Date();
    const planExpiresAt = calculatePlanExpiration(now);

    // Update user with new plan and credits
    const { User } = await import('../models/user.model.js');
    await User.findByIdAndUpdate(userId, {
      plan,
      planStartDate: now,
      planExpiresAt,
      $inc: { credits: planConfig.credits },
    });

    // Sync to user_keys collection for GoProxy
    if (user.apiKey) {
      const tier = plan === 'pro' ? 'pro' : 'dev';
      
      if (user.plan === 'free') {
        // Create new user_key entry
        await UserKey.create({
          _id: user.apiKey,
          name: userId,
          tier,
          tokensUsed: user.tokensUsed || 0,
          requestsCount: 0,
          isActive: true,
          createdAt: now,
          planExpiresAt,
        });
      } else {
        // Update existing user_key
        await UserKey.updateOne(
          { _id: user.apiKey },
          { tier, planExpiresAt }
        );
      }
    }
  }

  async getPaymentHistory(userId: string): Promise<IPayment[]> {
    return paymentRepository.findByUserId(userId);
  }
}

export const paymentService = new PaymentService();
