import { Request, Response } from 'express';
import { z } from 'zod';
import * as userKeyService from '../services/userkey.service.js';
import { CreateUserKeyDTO, UpdateUserKeyDTO } from '../dtos/user-key.dto.js';

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

export class UserKeyController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const keys = await userKeyService.listUserKeys();
      const stats = await userKeyService.getKeyStats();

      res.json({
        total: stats.total,
        active: stats.active,
        exhausted: stats.exhausted,
        keys: keys.map(k => ({
          ...k,
          id: k._id,
          tokens_remaining: calcTokensRemaining(k),
          usage_percent: Math.round(calcUsagePercent(k) * 100) / 100,
          is_exhausted: calcIsExhausted(k),
        })),
      });
    } catch (error) {
      console.error('Error listing keys:', error);
      res.status(500).json({ error: 'Failed to list keys' });
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const key = await userKeyService.getUserKey(req.params.id);
      if (!key) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }

      res.json({
        ...key,
        id: key._id,
        tokens_remaining: calcTokensRemaining(key),
        usage_percent: Math.round(calcUsagePercent(key) * 100) / 100,
        is_exhausted: calcIsExhausted(key),
      });
    } catch (error) {
      console.error('Error getting key:', error);
      res.status(500).json({ error: 'Failed to get key' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const input = CreateUserKeyDTO.parse(req.body);
      const key = await userKeyService.createUserKey(input);

      res.status(201).json({
        id: key._id,
        name: key.name,
        tier: key.tier,
        total_tokens: key.totalTokens,
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
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const input = UpdateUserKeyDTO.parse(req.body);
      const key = await userKeyService.updateUserKey(req.params.id, input);

      if (!key) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }

      res.json({
        id: key._id,
        total_tokens: key.totalTokens,
        tokens_remaining: calcTokensRemaining(key),
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
  }

  async delete(req: Request, res: Response): Promise<void> {
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
  }

  async reset(req: Request, res: Response): Promise<void> {
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
  }
}

export const userKeyController = new UserKeyController();
