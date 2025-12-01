import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { jwtAuth } from '../middleware/auth.middleware.js';
import { requestLogRepository } from '../repositories/request-log.repository.js';

const router = Router();

router.get('/me', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await userService.getProfile(username);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api-key', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = await userService.getFullApiKey(username);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ apiKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api-key/rotate', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await userService.rotateApiKey(username);
    res.json({
      newApiKey: result.newApiKey,
      oldKeyInvalidated: true,
      createdAt: result.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/billing', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const billing = await userService.getBillingInfo(username);
    if (!billing) {
      return res.status(404).json({ error: 'Billing info not found' });
    }

    res.json(billing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARILY DISABLED - request history
// router.get('/request-history', jwtAuth, async (req: Request, res: Response) => {
//   try {
//     const username = (req as any).user?.username;
//     if (!username) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
//
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const from = req.query.from ? new Date(req.query.from as string) : undefined;
//     const to = req.query.to ? new Date(req.query.to as string) : undefined;
//
//     const result = await requestLogRepository.findByUserId({
//       userId: username,
//       page,
//       limit,
//       from,
//       to,
//     });
//
//     res.json(result);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });
router.get('/request-history', jwtAuth, (req: Request, res: Response) => {
  res.status(503).json({ error: 'Request history is temporarily disabled' });
});

router.get('/credits-usage', jwtAuth, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const usage = await requestLogRepository.getCreditsUsageByPeriod(username);
    res.json({
      last1h: usage.last1h,
      last24h: usage.last24h,
      last7d: usage.last7d,
      last30d: usage.last30d,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
