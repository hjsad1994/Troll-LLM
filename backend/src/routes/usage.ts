import { Router, Request, Response } from 'express';
import * as userKeyService from '../services/userkey.service.js';

const router = Router();

// Helper functions
function calcTokensRemaining(key: { totalTokens: number; tokensUsed: number }) {
  return Math.max(0, key.totalTokens - key.tokensUsed);
}

function calcUsagePercent(key: { totalTokens: number; tokensUsed: number }) {
  if (key.totalTokens === 0) return 0;
  return (key.tokensUsed / key.totalTokens) * 100;
}

function calcIsExhausted(key: { totalTokens: number; tokensUsed: number }) {
  return key.tokensUsed >= key.totalTokens;
}

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

    const isExhausted = calcIsExhausted(key);

    // Return usage info with masked key
    res.json({
      key: userKeyService.maskKey(apiKey),
      tier: key.tier,
      rpm_limit: key.tier === 'pro' ? 1000 : 300, // Dev: 300 RPM, Pro: 1000 RPM
      total_tokens: key.totalTokens,
      tokens_used: key.tokensUsed,
      tokens_remaining: calcTokensRemaining(key),
      usage_percent: Math.round(calcUsagePercent(key) * 100) / 100,
      requests_count: key.requestsCount,
      is_active: key.isActive,
      is_exhausted: isExhausted,
      last_used_at: key.lastUsedAt,
      message: isExhausted 
        ? 'Token quota exhausted. Please contact admin.'
        : !key.isActive
        ? 'This API key has been revoked.'
        : null,
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

export default router;
