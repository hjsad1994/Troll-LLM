import { Router, Request, Response } from 'express';
import * as userKeyService from '../services/userkey.service.js';

const router = Router();

// GET /api/usage?key=xxx - Get usage for a specific key (public)
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const apiKey = req.query.key as string;

    if (!apiKey) {
      res.status(400).json({ error: 'API key is required (use ?key=xxx)' });
      return;
    }

    const key = await userKeyService.getUserKey(apiKey);

    if (!key) {
      res.status(404).json({ error: 'Invalid API key' });
      return;
    }

    // Return usage info with masked key
    res.json({
      key: userKeyService.maskKey(apiKey),
      tier: key.tier,
      rpm_limit: key.tier === 'pro' ? 1000 : 300, // Dev: 300 RPM, Pro: 1000 RPM
      tokens_used: key.tokensUsed,
      requests_count: key.requestsCount,
      is_active: key.isActive,
      last_used_at: key.lastUsedAt,
      message: !key.isActive ? 'This API key has been revoked.' : null,
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

export default router;
