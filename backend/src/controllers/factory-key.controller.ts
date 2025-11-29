import { Request, Response } from 'express';
import * as factoryKeyService from '../services/factorykey.service.js';

export class FactoryKeyController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const keys = await factoryKeyService.listFactoryKeys();
      const stats = await factoryKeyService.getFactoryKeyStats();

      res.json({
        ...stats,
        keys,
      });
    } catch (error) {
      console.error('Error listing factory keys:', error);
      res.status(500).json({ error: 'Failed to list factory keys' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { id, apiKey } = req.body;
      if (!id || !apiKey) {
        res.status(400).json({ error: 'id and apiKey are required' });
        return;
      }

      const key = await factoryKeyService.createFactoryKey(id, apiKey);
      // Return full apiKey only during creation - it will not be shown again
      res.status(201).json({
        ...key,
        _warning: 'Save this API key now - it will not be shown again',
      });
    } catch (error) {
      console.error('Error creating factory key:', error);
      res.status(500).json({ error: 'Failed to create factory key' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await factoryKeyService.deleteFactoryKey(req.params.id);

      if (!deleted) {
        res.status(404).json({ error: 'Factory key not found' });
        return;
      }

      res.json({ deleted: true, id: req.params.id });
    } catch (error) {
      console.error('Error deleting factory key:', error);
      res.status(500).json({ error: 'Failed to delete factory key' });
    }
  }

  async reset(req: Request, res: Response): Promise<void> {
    try {
      const key = await factoryKeyService.resetFactoryKeyStatus(req.params.id);

      if (!key) {
        res.status(404).json({ error: 'Factory key not found' });
        return;
      }

      res.json({
        ...key,
        reset_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resetting factory key:', error);
      res.status(500).json({ error: 'Failed to reset factory key' });
    }
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const factoryKeyId = req.params.id;
      const analytics = await factoryKeyService.getTokenAnalytics(factoryKeyId);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  async getAllAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const analytics = await factoryKeyService.getTokenAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
}

export const factoryKeyController = new FactoryKeyController();
