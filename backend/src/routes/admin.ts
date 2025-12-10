import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as userKeyService from '../services/userkey.service.js';
import * as metricsService from '../services/metrics.service.js';

const router = Router();

// Validation schemas
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(['dev', 'pro']),
  notes: z.string().max(500).optional(),
});

const updateKeySchema = z.object({
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// GET /admin/keys - List all user keys
router.get('/keys', async (_req: Request, res: Response) => {
  try {
    const keys = await userKeyService.listUserKeys();
    const stats = await userKeyService.getKeyStats();

    res.json({
      total: stats.total,
      active: stats.active,
      keys: keys.map(k => ({
        ...k,
        id: k._id,
      })),
    });
  } catch (error) {
    console.error('Error listing keys:', error);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// POST /admin/keys - Create new user key
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const input = createKeySchema.parse(req.body);
    const key = await userKeyService.createUserKey(input);

    res.status(201).json({
      id: key._id,
      name: key.name,
      tier: key.tier,
      created_at: key.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error creating key:', error);
    res.status(500).json({ error: 'Failed to create key' });
  }
});

// GET /admin/keys/:id - Get single key details
router.get('/keys/:id', async (req: Request, res: Response) => {
  try {
    const key = await userKeyService.getUserKey(req.params.id);
    if (!key) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    res.json({
      ...key,
      id: key._id,
    });
  } catch (error) {
    console.error('Error getting key:', error);
    res.status(500).json({ error: 'Failed to get key' });
  }
});

// PATCH /admin/keys/:id - Update user key
router.patch('/keys/:id', async (req: Request, res: Response) => {
  try {
    const input = updateKeySchema.parse(req.body);
    const key = await userKeyService.updateUserKey(req.params.id, input);

    if (!key) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    res.json({
      id: key._id,
      is_active: key.isActive,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error updating key:', error);
    res.status(500).json({ error: 'Failed to update key' });
  }
});

// DELETE /admin/keys/:id - Revoke or permanently delete user key
// Use ?permanent=true to permanently delete
router.delete('/keys/:id', async (req: Request, res: Response) => {
  try {
    const permanent = req.query.permanent === 'true';
    
    if (permanent) {
      const key = await userKeyService.deleteUserKey(req.params.id);
      if (!key) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }
      res.json({
        id: key._id,
        deleted: true,
        deleted_at: new Date().toISOString(),
      });
    } else {
      const key = await userKeyService.revokeUserKey(req.params.id);
      if (!key) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }
      res.json({
        id: key._id,
        revoked: true,
        revoked_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error deleting/revoking key:', error);
    res.status(500).json({ error: 'Failed to delete/revoke key' });
  }
});

// POST /admin/keys/:id/reset - Reset usage for a key
router.post('/keys/:id/reset', async (req: Request, res: Response) => {
  try {
    const key = await userKeyService.resetUserKeyUsage(req.params.id);

    if (!key) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }

    res.json({
      id: key._id,
      tokens_used: 0,
      requests_count: 0,
      reset_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error resetting key:', error);
    res.status(500).json({ error: 'Failed to reset key' });
  }
});

// GET /admin/metrics - Get system-wide metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'all';
    const validPeriods = ['1h', '24h', '7d', 'all'];
    
    if (!validPeriods.includes(period)) {
      res.status(400).json({ 
        error: 'Invalid period', 
        valid_periods: validPeriods 
      });
      return;
    }

    const metrics = await metricsService.getSystemMetrics(period);

    res.json({
      total_requests: metrics.totalRequests,
      tokens_used: metrics.tokensUsed,
      avg_latency_ms: metrics.avgLatencyMs,
      success_rate: metrics.successRate,
      period: metrics.period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

export default router;
