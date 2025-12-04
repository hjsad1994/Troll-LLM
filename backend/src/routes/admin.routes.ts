import { Router, Request, Response } from 'express';
import { userKeyController } from '../controllers/user-key.controller.js';
import { factoryKeyController } from '../controllers/factory-key.controller.js';
import { metricsController } from '../controllers/metrics.controller.js';
import { allowReadOnly, requireAdmin } from '../middleware/role.middleware.js';
import { userRepository } from '../repositories/user.repository.js';
import { requestLogRepository } from '../repositories/request-log.repository.js';
import { backupKeyRepository } from '../repositories/backup-key.repository.js';
import { PLAN_LIMITS, UserPlan } from '../models/user.model.js';

const router = Router();

// User Keys - users can read, only admin can write
router.get('/keys', (req, res) => userKeyController.list(req, res));
router.get('/keys/:id', (req, res) => userKeyController.get(req, res));
router.post('/keys', requireAdmin, (req, res) => userKeyController.create(req, res));
router.patch('/keys/:id', requireAdmin, (req, res) => userKeyController.update(req, res));
router.delete('/keys/:id', requireAdmin, (req, res) => userKeyController.delete(req, res));
router.post('/keys/:id/reset', requireAdmin, (req, res) => userKeyController.reset(req, res));

// Troll-Keys - admin only (contains sensitive upstream API keys)
router.get('/troll-keys', requireAdmin, (req, res) => factoryKeyController.list(req, res));
router.get('/troll-keys/analytics', requireAdmin, (req, res) => factoryKeyController.getAllAnalytics(req, res));
router.get('/troll-keys/:id/analytics', requireAdmin, (req, res) => factoryKeyController.getAnalytics(req, res));
router.post('/troll-keys', requireAdmin, (req, res) => factoryKeyController.create(req, res));
router.delete('/troll-keys/:id', requireAdmin, (req, res) => factoryKeyController.delete(req, res));
router.post('/troll-keys/:id/reset', requireAdmin, (req, res) => factoryKeyController.reset(req, res));

// Metrics - all authenticated users can read
router.get('/metrics', (req, res) => metricsController.getSystemMetrics(req, res));

// User Stats - admin only (for dashboard)
router.get('/user-stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'all';
    const stats = await userRepository.getUserStats(period);
    res.json({
      total_users: stats.total,
      by_plan: stats.byPlan,
      total_tokens_used: stats.totalTokensUsed,
      total_credits: stats.totalCredits,
      total_input_tokens: stats.totalInputTokens,
      total_output_tokens: stats.totalOutputTokens,
      total_credits_burned: stats.totalCreditsBurned,
      period,
    });
  } catch (error) {
    console.error('Failed to get user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// User Management - admin only
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const [users, stats, creditsBurnedMap] = await Promise.all([
      userRepository.listUsers(search),
      userRepository.getUserStats(),
      requestLogRepository.getCreditsBurnedByUser(),
    ]);
    const usersWithCredits = users.map((u: any) => ({
      ...u,
      creditsBurned: creditsBurnedMap[u._id] || 0,
    }));
    res.json({ users: usersWithCredits, stats, planLimits: PLAN_LIMITS });
  } catch (error) {
    console.error('Failed to list users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.get('/users/:username', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await userRepository.getFullUser(req.params.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash, passwordSalt, ...safeUser } = user as any;
    res.json(safeUser);
  } catch (error) {
    console.error('Failed to get user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.patch('/users/:username/plan', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    const validPlans: UserPlan[] = ['free', 'dev', 'pro'];
    
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be: free, dev, or pro' });
    }
    
    const user = await userRepository.updatePlan(req.params.username, plan);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${req.params.username} to ${plan} plan`,
      user: {
        username: user._id,
        plan: user.plan,
        credits: user.credits,
      }
    });
  } catch (error) {
    console.error('Failed to update user plan:', error);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

router.patch('/users/:username/credits', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { credits } = req.body;
    
    if (typeof credits !== 'number' || credits < 0) {
      return res.status(400).json({ error: 'Credits must be a non-negative number' });
    }
    
    const user = await userRepository.updateCredits(req.params.username, credits);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${req.params.username} credits to $${credits}`,
      user: {
        username: user._id,
        credits: user.credits,
      }
    });
  } catch (error) {
    console.error('Failed to update user credits:', error);
    res.status(500).json({ error: 'Failed to update user credits' });
  }
});

// Backup Keys - admin only (for auto key rotation)
router.get('/backup-keys', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [keys, stats] = await Promise.all([
      backupKeyRepository.findAll(),
      backupKeyRepository.getStats(),
    ]);
    // Mask API keys for security
    const maskedKeys = keys.map((k: any) => ({
      id: k._id,
      maskedApiKey: k.apiKey ? `${k.apiKey.slice(0, 8)}...${k.apiKey.slice(-4)}` : '***',
      isUsed: k.isUsed,
      activated: k.activated || false, // Key has been moved to troll_keys, can be deleted
      usedFor: k.usedFor,
      usedAt: k.usedAt,
      createdAt: k.createdAt,
    }));
    res.json({ keys: maskedKeys, ...stats });
  } catch (error) {
    console.error('Failed to list backup keys:', error);
    res.status(500).json({ error: 'Failed to list backup keys' });
  }
});

router.post('/backup-keys', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, apiKey } = req.body;
    if (!id || !apiKey) {
      return res.status(400).json({ error: 'ID and API key are required' });
    }
    const key = await backupKeyRepository.create({ id, apiKey });
    res.status(201).json({ 
      success: true, 
      key: {
        id: key._id,
        maskedApiKey: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
        isUsed: key.isUsed,
        createdAt: key.createdAt,
      }
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Backup key with this ID already exists' });
    }
    console.error('Failed to create backup key:', error);
    res.status(500).json({ error: 'Failed to create backup key' });
  }
});

router.delete('/backup-keys/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await backupKeyRepository.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Backup key not found' });
    }
    res.json({ success: true, message: 'Backup key deleted' });
  } catch (error) {
    console.error('Failed to delete backup key:', error);
    res.status(500).json({ error: 'Failed to delete backup key' });
  }
});

router.post('/backup-keys/:id/restore', requireAdmin, async (req: Request, res: Response) => {
  try {
    const key = await backupKeyRepository.markAsAvailable(req.params.id);
    if (!key) {
      return res.status(404).json({ error: 'Backup key not found' });
    }
    res.json({ success: true, message: 'Backup key restored to available' });
  } catch (error) {
    console.error('Failed to restore backup key:', error);
    res.status(500).json({ error: 'Failed to restore backup key' });
  }
});

// Generate referral codes for existing users without one
router.post('/generate-referral-codes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const count = await userRepository.generateReferralCodeForExistingUsers();
    res.json({ 
      success: true, 
      message: `Generated referral codes for ${count} users`,
      updatedCount: count 
    });
  } catch (error) {
    console.error('Failed to generate referral codes:', error);
    res.status(500).json({ error: 'Failed to generate referral codes' });
  }
});

export default router;
