import { Request, Response } from 'express';
import * as metricsService from '../services/metrics.service.js';

export class MetricsController {
  async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as string) || 'all';
      const validPeriods = ['1h', '3h', '8h', '24h', '7d', 'all'];
      
      if (!validPeriods.includes(period)) {
        res.status(400).json({ 
          error: 'Invalid period', 
          valid_periods: validPeriods 
        });
        return;
      }

      const metrics = await metricsService.getSystemMetrics(period);

      res.json({
        total_requests: metrics.totalRequests,
        tokens_used: metrics.tokensUsed,
        avg_latency_ms: metrics.avgLatencyMs,
        success_rate: metrics.successRate,
        period: metrics.period,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }
}

export const metricsController = new MetricsController();
