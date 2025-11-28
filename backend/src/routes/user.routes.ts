import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { jwtAuth } from '../middleware/auth.middleware.js';

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

export default router;
