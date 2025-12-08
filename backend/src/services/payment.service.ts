import { paymentRepository } from '../repositories/payment.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { 
  IPayment, 
  CreditPackage, 
  PACKAGE_CONFIG,
  generateOrderCode, 
  generateQRCodeUrl 
} from '../models/payment.model.js';
import { UserKey } from '../models/user-key.model.js';

export interface CheckoutResult {
  paymentId: string;
  orderCode: string;
  qrCodeUrl: string;
  amount: number;
  credits: number;
  package: CreditPackage;
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
  // Try to find TROLL20USD or TROLL40USD pattern in the text
  const match = text.match(/TROLL(20|40)USD\d+[A-Z0-9]+/i);
  return match ? match[0].toUpperCase() : null;
}

export class PaymentService {
  async createCheckout(userId: string, pkg: CreditPackage, discordId?: string, username?: string): Promise<CheckoutResult> {
    const pkgConfig = PACKAGE_CONFIG[pkg];
    if (!pkgConfig) {
      throw new Error('Invalid package');
    }

    // Validate Discord ID format (should be 17-19 digit number)
    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      throw new Error('Invalid Discord ID format. Please enter your Discord User ID (17-19 digits)');
    }

    const orderCode = generateOrderCode(pkg);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const payment = await paymentRepository.create({
      userId,
      discordId,
      username,
      package: pkg,
      credits: pkgConfig.credits,
      amount: pkgConfig.amount,
    });

    const qrCodeUrl = generateQRCodeUrl(payment.orderCode!, pkgConfig.amount, username);

    return {
      paymentId: payment._id.toString(),
      orderCode: payment.orderCode!,
      qrCodeUrl,
      amount: pkgConfig.amount,
      credits: pkgConfig.credits,
      package: pkg,
      expiresAt: payment.expiresAt,
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
      plan: payment.status === 'success' ? payment.package : undefined,
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
      console.log(`[Payment Webhook] Order code not found in DB: ${orderCode}`);
      return { processed: false, message: 'Payment not found' };
    }

    console.log(`[Payment Webhook] Payment found: userId=${payment.userId}, status=${payment.status}, amount=${payment.amount}`);

    // Check if already processed
    if (payment.status === 'success') {
      console.log(`[Payment Webhook] Already processed: ${orderCode}`);
      return { processed: false, message: 'Already processed' };
    }

    // Check if expired
    if (payment.status === 'expired') {
      console.log(`[Payment Webhook] Payment expired: ${orderCode}`);
      return { processed: false, message: 'Payment expired' };
    }

    // Validate amount
    if (payload.transferAmount !== payment.amount) {
      console.log(`[Payment Webhook] Amount mismatch: expected ${payment.amount}, got ${payload.transferAmount}`);
      return { processed: false, message: 'Amount mismatch - logged for review' };
    }

    console.log(`[Payment Webhook] Updating payment status to success...`);
    
    // Process successful payment
    await paymentRepository.updateStatus(
      payment._id.toString(),
      'success',
      payload.id.toString()
    );

    console.log(`[Payment Webhook] Calling addCredits for ${payment.userId}...`);
    
    // Add credits to user
    await this.addCredits(payment.userId, payment.package as CreditPackage, payment.credits);

    // Send webhook to Discord bot
    await this.notifyDiscordBot({
      discordId: payment.discordId || '',
      plan: payment.package,
      username: payment.userId,
      orderCode: payment.orderCode || orderCode,
      amount: payment.amount,
      transactionId: payload.id.toString(),
    });

    console.log(`[Payment Webhook] Success: ${orderCode} - User: ${payment.userId} - Package: $${payment.credits}`);
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

  private async addCredits(userId: string, pkg: CreditPackage, credits: number): Promise<void> {
    console.log(`[Payment] Adding $${credits} credits to user: ${userId} (package: ${pkg})`);
    
    const user = await userRepository.getFullUser(userId);
    if (!user) {
      console.log(`[Payment] User not found: ${userId}`);
      throw new Error('User not found');
    }

    const pkgConfig = PACKAGE_CONFIG[pkg];
    const now = new Date();
    
    // Calculate expiration: if user has existing credits, extend from current expiry; else 7 days from now
    let expiresAt: Date;
    if (user.expiresAt && user.expiresAt > now && user.credits > 0) {
      // Extend existing expiration by 7 days
      expiresAt = new Date(user.expiresAt.getTime() + pkgConfig.days * 24 * 60 * 60 * 1000);
      console.log(`[Payment] Extending expiration from ${user.expiresAt} to ${expiresAt}`);
    } else {
      // New purchase or expired: 7 days from now
      expiresAt = new Date(now.getTime() + pkgConfig.days * 24 * 60 * 60 * 1000);
    }

    // Update user with new credits
    const { User } = await import('../models/user.model.js');
    await User.findByIdAndUpdate(userId, {
      purchasedAt: now,
      expiresAt,
      $inc: { credits },
    });

    // Award referral bonus if this is first payment and user was referred
    await this.awardReferralBonus(userId, pkg);

    // Sync to user_keys collection for GoProxy
    if (user.apiKey) {
      const existingKey = await UserKey.findById(user.apiKey);
      if (!existingKey) {
        // Create new user_key entry
        await UserKey.create({
          _id: user.apiKey,
          name: userId,
          tier: 'pro',
          tokensUsed: user.creditsUsed || 0,
          requestsCount: 0,
          isActive: true,
          createdAt: now,
          expiresAt,
        });
      } else {
        // Update existing user_key
        await UserKey.updateOne(
          { _id: user.apiKey },
          { expiresAt }
        );
      }
    }

    console.log(`[Payment] ✅ Added $${credits} credits to ${userId}, expires: ${expiresAt}`);
  }

  private async awardReferralBonus(userId: string, pkg: CreditPackage): Promise<void> {
    console.log(`[Referral] Checking referral bonus for user: ${userId}`);
    
    const user = await userRepository.getFullUser(userId);
    if (!user) {
      console.log(`[Referral] User not found: ${userId}`);
      return;
    }

    console.log(`[Referral] User ${userId}: referredBy=${user.referredBy}, referralBonusAwarded=${user.referralBonusAwarded}`);

    // Check if user was referred and hasn't received bonus yet
    if (!user.referredBy) {
      console.log(`[Referral] User ${userId} was not referred by anyone`);
      return;
    }
    
    if (user.referralBonusAwarded) {
      console.log(`[Referral] User ${userId} already received referral bonus`);
      return;
    }

    // Determine bonus credits based on package
    const pkgConfig = PACKAGE_CONFIG[pkg];
    const bonusCredits = pkgConfig.refBonus;

    // Award refCredits to the referred user (new user)
    await userRepository.addRefCredits(userId, bonusCredits);
    await userRepository.markReferralBonusAwarded(userId);

    // Award refCredits to the referrer
    await userRepository.addRefCredits(user.referredBy, bonusCredits);

    console.log(`[Referral] ✅ Awarded $${bonusCredits} refCredits to ${userId} and ${user.referredBy} for $${pkg} package`);
  }

  async getPaymentHistory(userId: string): Promise<IPayment[]> {
    return paymentRepository.findByUserId(userId);
  }
}

export const paymentService = new PaymentService();
