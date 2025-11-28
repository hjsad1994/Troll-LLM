import { RequestLog, IRequestLog } from '../models/request-log.model.js';

export interface CreateRequestLogData {
  userKeyId: string;
  factoryKeyId: string;
  tokensUsed: number;
  statusCode: number;
  latencyMs?: number;
  isSuccess?: boolean;
}

export class RequestLogRepository {
  async create(data: CreateRequestLogData): Promise<IRequestLog> {
    const log = await RequestLog.create({
      ...data,
      isSuccess: data.isSuccess ?? (data.statusCode >= 200 && data.statusCode < 300),
    });
    return log.toObject();
  }

  async findByUserKey(userKeyId: string, limit: number = 100): Promise<IRequestLog[]> {
    return RequestLog.find({ userKeyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async findByFactoryKey(factoryKeyId: string, limit: number = 100): Promise<IRequestLog[]> {
    return RequestLog.find({ factoryKeyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getMetrics(since?: Date): Promise<{
    totalRequests: number;
    totalTokens: number;
    avgLatencyMs: number;
    successRate: number;
  }> {
    const match = since ? { createdAt: { $gte: since } } : {};
    
    const result = await RequestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$tokensUsed' },
          avgLatencyMs: { $avg: '$latencyMs' },
          successCount: { $sum: { $cond: ['$isSuccess', 1, 0] } },
        },
      },
    ]);

    if (result.length === 0) {
      return { totalRequests: 0, totalTokens: 0, avgLatencyMs: 0, successRate: 100 };
    }

    const { totalRequests, totalTokens, avgLatencyMs, successCount } = result[0];
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;

    return {
      totalRequests,
      totalTokens,
      avgLatencyMs: Math.round(avgLatencyMs || 0),
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async getTokenAnalytics(factoryKeyId?: string): Promise<{
    last1h: number;
    last24h: number;
    last7d: number;
  }> {
    const now = new Date();
    const hour1 = new Date(now.getTime() - 60 * 60 * 1000);
    const hours24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const match: any = {};
    if (factoryKeyId) match.factoryKeyId = factoryKeyId;

    const [h1, h24, d7] = await Promise.all([
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: hour1 } } },
        { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
      ]),
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: hours24 } } },
        { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
      ]),
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: days7 } } },
        { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
      ]),
    ]);

    return {
      last1h: h1[0]?.total || 0,
      last24h: h24[0]?.total || 0,
      last7d: d7[0]?.total || 0,
    };
  }
}

export const requestLogRepository = new RequestLogRepository();
