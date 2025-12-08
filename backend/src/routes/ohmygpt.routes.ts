import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as ohmygptService from '../services/ohmygpt.service.js';

const router = Router();

// Validation schemas
const createKeySchema = z.object({
  id: z.string().min(1).max(50),
  apiKey: z.string().min(1),
});

const createBindingSchema = z.object({
  proxyId: z.string().min(1),
  ohmygptKeyId: z.string().min(1),
  priority: z.number().int().min(1).max(10),
});

const updateBindingSchema = z.object({
  priority: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

// ============ KEYS ============

// GET /admin/ohmygpt/keys - List all keys
router.get('/keys', async (_req: Request, res: Response) => {
  try {
    const keys = await ohmygptService.listKeys();
    const stats = await ohmygptService.getStats();
    
    // Mask API keys for security
    const maskedKeys = keys.map(k => ({
      ...k,
      apiKey: k.apiKey ? `${k.apiKey.slice(0, 8)}...${k.apiKey.slice(-4)}` : '***',
    }));
    
    res.json({ keys: maskedKeys, ...stats });
  } catch (error) {
    console.error('Error listing OhmyGPT keys:', error);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// POST /admin/ohmygpt/keys - Create key
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const input = createKeySchema.parse(req.body);
    const key = await ohmygptService.createKey(input);
    
    res.status(201).json({
      ...key,
      apiKey: `${key.apiKey.slice(0, 8)}...${key.apiKey.slice(-4)}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating OhmyGPT key:', error);
    res.status(500).json({ error: 'Failed to create key' });
  }
});

// DELETE /admin/ohmygpt/keys/:id - Delete key
router.delete('/keys/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ohmygptService.deleteKey(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.json({ success: true, message: 'Key and its bindings deleted' });
  } catch (error) {
    console.error('Error deleting OhmyGPT key:', error);
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

// POST /admin/ohmygpt/keys/:id/reset - Reset key stats
router.post('/keys/:id/reset', async (req: Request, res: Response) => {
  try {
    const key = await ohmygptService.resetKeyStats(req.params.id);
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.json({ success: true, message: 'Key stats reset' });
  } catch (error) {
    console.error('Error resetting OhmyGPT key:', error);
    res.status(500).json({ error: 'Failed to reset key' });
  }
});

// ============ BINDINGS ============

// GET /admin/ohmygpt/bindings - List all bindings
router.get('/bindings', async (_req: Request, res: Response) => {
  try {
    const [bindings, proxies, keys] = await Promise.all([
      ohmygptService.listBindings(),
      ohmygptService.listProxies(),
      ohmygptService.listKeys(),
    ]);
    
    // Create lookup maps
    const proxyMap = new Map(proxies.map(p => [p._id, p]));
    const keyMap = new Map(keys.map(k => [k._id, k]));
    
    // Enrich bindings with names
    const enrichedBindings = bindings.map(b => ({
      ...b,
      proxyName: proxyMap.get(b.proxyId)?.name || b.proxyId,
      keyStatus: keyMap.get(b.ohmygptKeyId)?.status || 'unknown',
    }));
    
    // Group by proxy
    const byProxy: Record<string, typeof enrichedBindings> = {};
    for (const binding of enrichedBindings) {
      if (!byProxy[binding.proxyId]) {
        byProxy[binding.proxyId] = [];
      }
      byProxy[binding.proxyId].push(binding);
    }
    
    res.json({
      total: bindings.length,
      bindings: enrichedBindings,
      byProxy,
      proxies: proxies.map(p => ({ _id: p._id, name: p.name, status: p.status, isActive: p.isActive })),
      keys: keys.map(k => ({ _id: k._id, status: k.status })),
    });
  } catch (error) {
    console.error('Error listing bindings:', error);
    res.status(500).json({ error: 'Failed to list bindings' });
  }
});

// GET /admin/ohmygpt/bindings/:proxyId - Get bindings for a proxy
router.get('/bindings/:proxyId', async (req: Request, res: Response) => {
  try {
    const bindings = await ohmygptService.getBindingsForProxy(req.params.proxyId);
    res.json({ bindings });
  } catch (error) {
    console.error('Error getting bindings:', error);
    res.status(500).json({ error: 'Failed to get bindings' });
  }
});

// POST /admin/ohmygpt/bindings - Create binding
router.post('/bindings', async (req: Request, res: Response) => {
  try {
    const input = createBindingSchema.parse(req.body);
    const binding = await ohmygptService.createBinding(input);
    res.status(201).json(binding);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating binding:', error);
    res.status(500).json({ error: 'Failed to create binding' });
  }
});

// PATCH /admin/ohmygpt/bindings/:proxyId/:keyId - Update binding
router.patch('/bindings/:proxyId/:keyId', async (req: Request, res: Response) => {
  try {
    const input = updateBindingSchema.parse(req.body);
    const binding = await ohmygptService.updateBinding(req.params.proxyId, req.params.keyId, input);
    if (!binding) {
      return res.status(404).json({ error: 'Binding not found' });
    }
    res.json(binding);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error updating binding:', error);
    res.status(500).json({ error: 'Failed to update binding' });
  }
});

// DELETE /admin/ohmygpt/bindings/:proxyId/:keyId - Delete binding
router.delete('/bindings/:proxyId/:keyId', async (req: Request, res: Response) => {
  try {
    const deleted = await ohmygptService.deleteBinding(req.params.proxyId, req.params.keyId);
    if (!deleted) {
      return res.status(404).json({ error: 'Binding not found' });
    }
    res.json({ success: true, message: 'Binding deleted' });
  } catch (error) {
    console.error('Error deleting binding:', error);
    res.status(500).json({ error: 'Failed to delete binding' });
  }
});

// DELETE /admin/ohmygpt/bindings/:proxyId - Delete all bindings for a proxy
router.delete('/bindings/:proxyId', async (req: Request, res: Response) => {
  try {
    const count = await ohmygptService.deleteAllBindingsForProxy(req.params.proxyId);
    res.json({ success: true, message: `Deleted ${count} bindings` });
  } catch (error) {
    console.error('Error deleting bindings:', error);
    res.status(500).json({ error: 'Failed to delete bindings' });
  }
});

// ============ STATS ============

// GET /admin/ohmygpt/stats - Get stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await ohmygptService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============ BACKUP KEYS ============

// GET /admin/ohmygpt/backup-keys - List backup keys
router.get('/backup-keys', async (_req: Request, res: Response) => {
  try {
    const [keys, stats] = await Promise.all([
      ohmygptService.listBackupKeys(),
      ohmygptService.getBackupKeyStats(),
    ]);
    
    // Mask API keys
    const maskedKeys = keys.map(k => ({
      id: k._id,
      maskedApiKey: k.apiKey ? `${k.apiKey.slice(0, 8)}...${k.apiKey.slice(-4)}` : '***',
      isUsed: k.isUsed,
      activated: k.activated,
      usedFor: k.usedFor,
      usedAt: k.usedAt,
      createdAt: k.createdAt,
    }));
    
    res.json({ keys: maskedKeys, ...stats });
  } catch (error) {
    console.error('Error listing backup keys:', error);
    res.status(500).json({ error: 'Failed to list backup keys' });
  }
});

// POST /admin/ohmygpt/backup-keys - Create backup key
router.post('/backup-keys', async (req: Request, res: Response) => {
  try {
    const input = createKeySchema.parse(req.body);
    const key = await ohmygptService.createBackupKey(input);
    
    res.status(201).json({
      id: key._id,
      maskedApiKey: `${key.apiKey.slice(0, 8)}...${key.apiKey.slice(-4)}`,
      isUsed: key.isUsed,
      activated: key.activated,
      createdAt: key.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating backup key:', error);
    res.status(500).json({ error: 'Failed to create backup key' });
  }
});

// DELETE /admin/ohmygpt/backup-keys/:id - Delete backup key
router.delete('/backup-keys/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ohmygptService.deleteBackupKey(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Backup key not found' });
    }
    res.json({ success: true, message: 'Backup key deleted' });
  } catch (error) {
    console.error('Error deleting backup key:', error);
    res.status(500).json({ error: 'Failed to delete backup key' });
  }
});

// POST /admin/ohmygpt/backup-keys/:id/restore - Restore backup key
router.post('/backup-keys/:id/restore', async (req: Request, res: Response) => {
  try {
    const restored = await ohmygptService.restoreBackupKey(req.params.id);
    if (!restored) {
      return res.status(404).json({ error: 'Backup key not found' });
    }
    res.json({ success: true, message: 'Backup key restored' });
  } catch (error) {
    console.error('Error restoring backup key:', error);
    res.status(500).json({ error: 'Failed to restore backup key' });
  }
});

export default router;
