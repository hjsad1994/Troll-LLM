import { Router, Request, Response } from 'express';
import { userKeyController } from '../controllers/user-key.controller.js';
import { factoryKeyController } from '../controllers/factory-key.controller.js';
import { metricsController } from '../controllers/metrics.controller.js';
import { pricingController } from '../controllers/pricing.controller.js';
import { allowReadOnly, requireAdmin } from '../middleware/role.middleware.js';
import { userRepository } from '../repositories/user.repository.js';
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

// Model Pricing - users can read, only admin can write
router.get('/pricing', (req, res) => pricingController.list(req, res));
router.get('/pricing/model/:modelId', (req, res) => pricingController.getByModelId(req, res));
router.get('/pricing/:id', (req, res) => pricingController.get(req, res));
router.post('/pricing', requireAdmin, (req, res) => pricingController.create(req, res));
router.put('/pricing/model/:modelId', requireAdmin, (req, res) => pricingController.updateByModelId(req, res));
router.put('/pricing/:id', requireAdmin, (req, res) => pricingController.update(req, res));
router.delete('/pricing/:id', requireAdmin, (req, res) => pricingController.delete(req, res));
router.post('/pricing/seed', requireAdmin, (req, res) => pricingController.seed(req, res));

// User Management - admin only
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const users = await userRepository.listUsers(search);
    const stats = await userRepository.getUserStats();
    res.json({ users, stats, planLimits: PLAN_LIMITS });
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
        totalTokens: user.totalTokens,
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

export default router;
