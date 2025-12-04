import { paymentRepository } from '../repositories/payment.repository.js';
import { userRepository, calculatePlanExpiration } from '../repositories/user.repository.js';
import { 
  IPayment, 
  PaymentPlan, 
  PLAN_PRICES,
  PAYPAL_PRO_PRICE_USD,
  generateOrderCode, 
  generateQRCodeUrl 
} from '../models/payment.model.js';
import { UserKey } from '../models/user-key.model.js';

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

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

export interface PayPalOrderResult {
  orderId: string;
  paymentId: string;
}

export interface PayPalCaptureResult {
  success: boolean;
  plan: string;
  captureId?: string;
}

export interface PayPalWebhookPayload {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status: string;
    amount?: {
      value: string;
      currency_code: string;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
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

    console.log(`[Payment Webhook] Calling upgradePlan for ${payment.userId}...`);
    
    // Upgrade user plan
    await this.upgradePlan(payment.userId, payment.plan);

    // Send webhook to Discord bot if discordId exists
    if (payment.discordId) {
      await this.notifyDiscordBot({
        discordId: payment.discordId,
        plan: payment.plan,
        username: payment.userId,
        orderCode: payment.orderCode || orderCode,
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
    console.log(`[Payment] Upgrading plan for user: ${userId} to ${plan}`);
    
    const user = await userRepository.getFullUser(userId);
    if (!user) {
      console.log(`[Payment] User not found: ${userId}`);
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

    // Award referral bonus if this is first payment and user was referred
    await this.awardReferralBonus(userId, plan);

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

  private async awardReferralBonus(userId: string, plan: PaymentPlan): Promise<void> {
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

    // Determine bonus amount based on plan
    const bonusAmount = plan === 'pro' ? 50 : 25;

    // Award refCredits to the referred user (new user)
    await userRepository.addRefCredits(userId, bonusAmount);
    await userRepository.markReferralBonusAwarded(userId);

    // Award refCredits to the referrer
    await userRepository.addRefCredits(user.referredBy, bonusAmount);

    console.log(`[Referral] ✅ Awarded ${bonusAmount} refCredits to ${userId} and ${user.referredBy} for ${plan} plan`);
  }

  async getPaymentHistory(userId: string): Promise<IPayment[]> {
    return paymentRepository.findByUserId(userId);
  }

  // PayPal Methods
  private async getPayPalAccessToken(): Promise<string> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[PayPal] Failed to get access token:', error);
      throw new Error('Failed to authenticate with PayPal');
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  async createPayPalOrder(userId: string, plan: PaymentPlan, discordId?: string): Promise<PayPalOrderResult> {
    if (plan !== 'pro') {
      throw new Error('PayPal only supports Pro plan');
    }

    if (discordId && !/^\d{17,19}$/.test(discordId)) {
      throw new Error('Invalid Discord ID format');
    }

    const accessToken = await this.getPayPalAccessToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes for PayPal

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: PAYPAL_PRO_PRICE_USD.toFixed(2),
          },
          description: 'TrollLLM Pro Plan',
        }],
        application_context: {
          brand_name: 'TrollLLM',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: 'https://trollllm.xyz/checkout/success',
          cancel_url: 'https://trollllm.xyz/checkout/cancel',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[PayPal] Failed to create order:', error);
      throw new Error('Failed to create PayPal order');
    }

    const order = await response.json() as { id: string };
    console.log(`[PayPal] Created order: ${order.id} for user: ${userId}`);

    const payment = await paymentRepository.createPayPal({
      userId,
      discordId,
      plan: 'pro',
      amount: PAYPAL_PRO_PRICE_USD,
      paypalOrderId: order.id,
      expiresAt,
    });

    return {
      orderId: order.id,
      paymentId: payment._id.toString(),
    };
  }

  async capturePayPalOrder(orderId: string, userId: string): Promise<PayPalCaptureResult> {
    const payment = await paymentRepository.findByPayPalOrderId(orderId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (payment.status === 'success') {
      return { success: true, plan: payment.plan, captureId: payment.paypalCaptureId };
    }

    if (payment.status === 'expired') {
      throw new Error('Payment expired');
    }

    const accessToken = await this.getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[PayPal] Failed to capture order:', error);
      throw new Error('Failed to capture PayPal payment');
    }

    const captureData = await response.json() as { 
      id: string; 
      status: string;
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{ 
            id: string;
            amount?: { value: string; currency_code: string };
          }>;
        };
      }>;
    };

    if (captureData.status !== 'COMPLETED') {
      throw new Error(`Payment not completed. Status: ${captureData.status}`);
    }

    // Verify amount
    const capturedAmount = parseFloat(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
    );
    if (capturedAmount < PAYPAL_PRO_PRICE_USD) {
      console.error(`[PayPal] Amount mismatch: expected ${PAYPAL_PRO_PRICE_USD}, got ${capturedAmount}`);
      throw new Error('Payment amount mismatch');
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || captureData.id;

    await paymentRepository.updateStatus(
      payment._id.toString(),
      'success',
      captureId,
      'paypal'
    );

    await this.upgradePlan(payment.userId, payment.plan);

    if (payment.discordId) {
      await this.notifyDiscordBot({
        discordId: payment.discordId,
        plan: payment.plan,
        username: payment.userId,
        orderCode: `PAYPAL-${orderId}`,
        amount: PAYPAL_PRO_PRICE_USD,
        transactionId: captureId,
      });
    }

    console.log(`[PayPal] Captured order: ${orderId} - User: ${userId} - Plan: ${payment.plan}`);
    return { success: true, plan: payment.plan, captureId };
  }

  async verifyPayPalWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.error('[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured');
      return false;
    }

    const accessToken = await this.getPayPalAccessToken();
    
    const verifyPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    });

    if (!response.ok) {
      console.error('[PayPal Webhook] Signature verification request failed');
      return false;
    }

    const result = await response.json() as { verification_status: string };
    return result.verification_status === 'SUCCESS';
  }

  async processPayPalWebhook(
    payload: PayPalWebhookPayload, 
    headers: Record<string, string>, 
    rawBody: string
  ): Promise<{ processed: boolean; message: string }> {
    console.log('[PayPal Webhook] Received:', JSON.stringify(payload));

    // Verify webhook signature
    const isValid = await this.verifyPayPalWebhookSignature(headers, rawBody);
    if (!isValid) {
      console.error('[PayPal Webhook] Invalid signature - possible fraud attempt!');
      return { processed: false, message: 'Invalid webhook signature' };
    }

    if (payload.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return { processed: false, message: `Ignored event type: ${payload.event_type}` };
    }

    const orderId = payload.resource?.supplementary_data?.related_ids?.order_id;
    if (!orderId) {
      console.log('[PayPal Webhook] No order ID in payload');
      return { processed: false, message: 'No order ID found' };
    }

    // Verify amount
    const paidAmount = parseFloat(payload.resource?.amount?.value || '0');
    if (paidAmount < PAYPAL_PRO_PRICE_USD) {
      console.error(`[PayPal Webhook] Amount mismatch: expected ${PAYPAL_PRO_PRICE_USD}, got ${paidAmount}`);
      return { processed: false, message: 'Amount mismatch' };
    }

    const payment = await paymentRepository.findByPayPalOrderId(orderId);
    if (!payment) {
      console.log(`[PayPal Webhook] Payment not found for order: ${orderId}`);
      return { processed: false, message: 'Payment not found' };
    }

    if (payment.status === 'success') {
      return { processed: false, message: 'Already processed' };
    }

    const captureId = payload.resource.id;
    await paymentRepository.updateStatus(
      payment._id.toString(),
      'success',
      captureId,
      'paypal'
    );

    await this.upgradePlan(payment.userId, payment.plan);

    if (payment.discordId) {
      await this.notifyDiscordBot({
        discordId: payment.discordId,
        plan: payment.plan,
        username: payment.userId,
        orderCode: `PAYPAL-${orderId}`,
        amount: PAYPAL_PRO_PRICE_USD,
        transactionId: captureId,
      });
    }

    console.log(`[PayPal Webhook] Success: ${orderId} - User: ${payment.userId}`);
    return { processed: true, message: 'Payment processed successfully' };
  }
}

export const paymentService = new PaymentService();
