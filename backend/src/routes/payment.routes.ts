import { Router, Request, Response } from 'express';
import { paymentService, SepayWebhookPayload } from '../services/payment.service.js';
import { jwtAuth } from '../middleware/auth.middleware.js';
import { PLAN_PRICES, PaymentPlan } from '../models/payment.model.js';

const router = Router();

// Middleware to verify SePay webhook API key
function verifySepayWebhook(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const expectedApiKey = process.env.SEPAY_API_KEY;

  if (!expectedApiKey) {
    console.error('[Payment Webhook] SEPAY_API_KEY not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  if (!authHeader || authHeader !== `Apikey ${expectedApiKey}`) {
    console.log('[Payment Webhook] Invalid authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// POST /api/payment/checkout - Create payment and get QR code
router.post('/checkout', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plan, discordId } = req.body as { plan: PaymentPlan; discordId?: string };
    
    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Must be "dev" or "pro"' });
    }

    // Use the logged-in username as transfer content
    const result = await paymentService.createCheckout(username, plan, discordId, username);
    
    res.json({
      paymentId: result.paymentId,
      orderCode: result.orderCode,
      qrCodeUrl: result.qrCodeUrl,
      amount: result.amount,
      plan: result.plan,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('[Payment Checkout Error]', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/payment/webhook - Handle SePay webhook
router.post('/webhook', verifySepayWebhook, async (req: Request, res: Response) => {
  try {
    const payload = req.body as SepayWebhookPayload;
    
    console.log('[Payment Webhook] Received:', JSON.stringify(payload));
    
    const result = await paymentService.processWebhook(payload);
    
    // Always return 200 to acknowledge receipt
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Payment Webhook Error]', error);
    // Still return 200 to prevent SePay from retrying
    res.status(200).json({ processed: false, message: error.message });
  }
});

// GET /api/payment/:id/status - Poll payment status
router.get('/:id/status', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const status = await paymentService.getPaymentStatus(id, username);
    
    if (!status) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(status);
  } catch (error: any) {
    console.error('[Payment Status Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payment/history - Get user's payment history
router.get('/history', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payments = await paymentService.getPaymentHistory(username);
    
    res.json({
      payments: payments.map(p => ({
        id: p._id,
        orderCode: p.orderCode,
        plan: p.plan,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('[Payment History Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payment/plans - Get available plans (public)
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    plans: [
      {
        id: 'dev',
        name: 'Dev',
        price: PLAN_PRICES.dev.amount,
        credits: PLAN_PRICES.dev.credits,
        currency: 'VND',
        features: ['225 credits/month', '300 requests/minute', 'All Claude models'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: PLAN_PRICES.pro.amount,
        credits: PLAN_PRICES.pro.credits,
        currency: 'VND',
        features: ['500 credits/month', '1000 requests/minute', 'All Claude models', 'Priority support'],
      },
    ],
  });
});

export default router;
