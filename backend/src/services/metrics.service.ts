import { RequestLog } from '../db/mongodb.js';

export interface SystemMetrics {
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  successRate: number;
  period: string;
}

function getPeriodFilter(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

export async function getSystemMetrics(period: string = 'all'): Promise<SystemMetrics> {
  const periodStart = getPeriodFilter(period);
  
  const matchStage: Record<string, unknown> = {};
  if (periodStart) {
    matchStage.createdAt = { $gte: periodStart };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: { $ifNull: ['$tokensUsed', 0] } },
        // Only avg latency from records that have it
        totalLatency: { $sum: { $ifNull: ['$latencyMs', 0] } },
        latencyCount: { 
          $sum: { 
            $cond: [{ $ifNull: ['$latencyMs', false] }, 1, 0] 
          } 
        },
        // Count success: use isSuccess if available, otherwise check statusCode 2xx
        successCount: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$isSuccess', true] },
                  // Fallback: if isSuccess doesn't exist, check statusCode is 2xx
                  {
                    $and: [
                      { $eq: [{ $type: '$isSuccess' }, 'missing'] },
                      { $gte: ['$statusCode', 200] },
                      { $lt: ['$statusCode', 300] }
                    ]
                  }
                ]
              },
              1,
              0
            ]
          }
        },
      }
    }
  ];

  const results = await RequestLog.aggregate(pipeline);
  
  if (results.length === 0) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      avgLatencyMs: 0,
      successRate: 0,
      period,
    };
  }

  const data = results[0];
  const successRate = data.totalRequests > 0 
    ? (data.successCount / data.totalRequests) * 100 
    : 0;
  
  // Calculate avg latency only from records that have latency data
  const avgLatencyMs = data.latencyCount > 0 
    ? data.totalLatency / data.latencyCount 
    : 0;

  return {
    totalRequests: data.totalRequests,
    totalTokens: data.totalTokens || 0,
    avgLatencyMs: Math.round(avgLatencyMs),
    successRate: Math.round(successRate * 100) / 100,
    period,
  };
}
