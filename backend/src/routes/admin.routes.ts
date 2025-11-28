import { Router } from 'express';
import { userKeyController } from '../controllers/user-key.controller.js';
import { factoryKeyController } from '../controllers/factory-key.controller.js';
import { metricsController } from '../controllers/metrics.controller.js';
import { allowReadOnly, requireAdmin } from '../middleware/role.middleware.js';

const router = Router();

// User Keys - users can read, only admin can write
router.get('/keys', (req, res) => userKeyController.list(req, res));
router.get('/keys/:id', (req, res) => userKeyController.get(req, res));
router.post('/keys', requireAdmin, (req, res) => userKeyController.create(req, res));
router.patch('/keys/:id', requireAdmin, (req, res) => userKeyController.update(req, res));
router.delete('/keys/:id', requireAdmin, (req, res) => userKeyController.delete(req, res));
router.post('/keys/:id/reset', requireAdmin, (req, res) => userKeyController.reset(req, res));

// Factory Keys - users can read, only admin can write
router.get('/factory-keys', (req, res) => factoryKeyController.list(req, res));
router.get('/factory-keys/analytics', (req, res) => factoryKeyController.getAllAnalytics(req, res));
router.get('/factory-keys/:id/analytics', (req, res) => factoryKeyController.getAnalytics(req, res));
router.post('/factory-keys', requireAdmin, (req, res) => factoryKeyController.create(req, res));
router.delete('/factory-keys/:id', requireAdmin, (req, res) => factoryKeyController.delete(req, res));
router.post('/factory-keys/:id/reset', requireAdmin, (req, res) => factoryKeyController.reset(req, res));

// Metrics - all authenticated users can read
router.get('/metrics', (req, res) => metricsController.getSystemMetrics(req, res));

export default router;
