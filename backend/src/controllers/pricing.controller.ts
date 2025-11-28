import { Request, Response } from 'express';
import * as pricingService from '../services/pricing.service.js';
import { CreateModelPricingDTO, UpdateModelPricingDTO } from '../dtos/pricing.dto.js';

export class PricingController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const pricing = await pricingService.listModelPricing();
      const stats = await pricingService.getPricingStats();

      res.json({
        total: stats.total,
        active: stats.active,
        pricing,
      });
    } catch (error) {
      console.error('Error listing model pricing:', error);
      res.status(500).json({ error: 'Failed to list model pricing' });
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const pricing = await pricingService.getModelPricing(req.params.id);

      if (!pricing) {
        res.status(404).json({ error: 'Model pricing not found' });
        return;
      }

      res.json(pricing);
    } catch (error) {
      console.error('Error getting model pricing:', error);
      res.status(500).json({ error: 'Failed to get model pricing' });
    }
  }

  async getByModelId(req: Request, res: Response): Promise<void> {
    try {
      const pricing = await pricingService.getModelPricingByModelId(req.params.modelId);

      if (!pricing) {
        res.status(404).json({ error: 'Model pricing not found' });
        return;
      }

      res.json(pricing);
    } catch (error) {
      console.error('Error getting model pricing:', error);
      res.status(500).json({ error: 'Failed to get model pricing' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = CreateModelPricingDTO.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
        return;
      }

      const pricing = await pricingService.createModelPricing(parseResult.data);
      res.status(201).json(pricing);
    } catch (error: any) {
      console.error('Error creating model pricing:', error);
      if (error.message?.includes('already exists')) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create model pricing' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = UpdateModelPricingDTO.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
        return;
      }

      const pricing = await pricingService.updateModelPricing(req.params.id, parseResult.data);

      if (!pricing) {
        res.status(404).json({ error: 'Model pricing not found' });
        return;
      }

      res.json(pricing);
    } catch (error) {
      console.error('Error updating model pricing:', error);
      res.status(500).json({ error: 'Failed to update model pricing' });
    }
  }

  async updateByModelId(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = UpdateModelPricingDTO.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
        return;
      }

      const pricing = await pricingService.updateModelPricingByModelId(req.params.modelId, parseResult.data);

      if (!pricing) {
        res.status(404).json({ error: 'Model pricing not found' });
        return;
      }

      res.json(pricing);
    } catch (error) {
      console.error('Error updating model pricing:', error);
      res.status(500).json({ error: 'Failed to update model pricing' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await pricingService.deleteModelPricing(req.params.id);

      if (!deleted) {
        res.status(404).json({ error: 'Model pricing not found' });
        return;
      }

      res.json({ deleted: true, id: req.params.id });
    } catch (error) {
      console.error('Error deleting model pricing:', error);
      res.status(500).json({ error: 'Failed to delete model pricing' });
    }
  }

  async seed(_req: Request, res: Response): Promise<void> {
    try {
      await pricingService.seedDefaultPricing();
      res.json({ success: true, message: 'Default pricing seeded' });
    } catch (error) {
      console.error('Error seeding pricing:', error);
      res.status(500).json({ error: 'Failed to seed pricing' });
    }
  }
}

export const pricingController = new PricingController();
