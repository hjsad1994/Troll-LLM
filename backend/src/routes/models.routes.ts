import { Router, Request, Response } from 'express';
import { getModels } from '../services/models.service.js';

const router = Router();

// GET /api/models - Get all available models
router.get('/', async (_req: Request, res: Response) => {
  try {
    const models = getModels();
    res.json({
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        reasoning: m.reasoning,
        inputPricePerMTok: m.input_price_per_mtok,
        outputPricePerMTok: m.output_price_per_mtok,
      })),
      count: models.length,
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

export default router;
