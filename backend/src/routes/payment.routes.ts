import { Router, Request, Response } from 'express';
import { paymentService, SepayWebhookPayload } from '../services/payment.service.js';
import { jwtAuth } from '../middleware/auth.middleware.js';
import { PACKAGE_CONFIG, CreditPackage } from '../models/payment.model.js';

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

    // Support both 'package' and 'plan' for backward compatibility
    const { package: pkg, plan, discordId } = req.body as { package?: CreditPackage; plan?: string; discordId?: string };
    
    // Map old plan names to new package names for backward compatibility
    let creditPackage: CreditPackage | undefined = pkg;
    if (!creditPackage && plan) {
      // Map dev/pro to 20/40 for backward compatibility
      if (plan === 'dev' || plan === '6m' || plan === '20') creditPackage = '20';
      else if (plan === 'pro' || plan === 'pro-troll' || plan === '12m' || plan === '40') creditPackage = '40';
    }
    
    if (!creditPackage || !PACKAGE_CONFIG[creditPackage]) {
      return res.status(400).json({ error: 'Invalid package. Must be "20" or "40"' });
    }

    // Use the logged-in username as transfer content
    const result = await paymentService.createCheckout(username, creditPackage, discordId, username);
    
    res.json({
      paymentId: result.paymentId,
      orderCode: result.orderCode,
      qrCodeUrl: result.qrCodeUrl,
      amount: result.amount,
      credits: result.credits,
      package: result.package,
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
        package: p.package,
        credits: p.credits,
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

// GET /api/payment/packages - Get available packages (public)
router.get('/packages', (_req: Request, res: Response) => {
  res.json({
    packages: [
      {
        id: '20',
        name: '$20 Credits',
        price: PACKAGE_CONFIG['20'].amount,
        credits: PACKAGE_CONFIG['20'].credits,
        days: PACKAGE_CONFIG['20'].days,
        currency: 'VND',
        features: ['$20 USD credits', 'Valid for 7 days', 'All AI models'],
      },
      {
        id: '40',
        name: '$40 Credits',
        price: PACKAGE_CONFIG['40'].amount,
        credits: PACKAGE_CONFIG['40'].credits,
        days: PACKAGE_CONFIG['40'].days,
        currency: 'VND',
        features: ['$40 USD credits', 'Valid for 7 days', 'All AI models', 'Best value'],
      },
    ],
  });
});

export default router;
