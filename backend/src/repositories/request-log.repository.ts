import { RequestLog, IRequestLog } from '../models/request-log.model.js';

export interface CreateRequestLogData {
  userId?: string;
  userKeyId: string;
  factoryKeyId: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheHitTokens?: number;
  creditsCost?: number;
  tokensUsed: number;
  statusCode: number;
  latencyMs?: number;
  isSuccess?: boolean;
}

export interface RequestHistoryQuery {
  userId: string;
  page?: number;
  limit?: number;
  from?: Date;
  to?: Date;
}

export interface RequestHistoryResult {
  requests: IRequestLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

  async findByUserId(query: RequestHistoryQuery): Promise<RequestHistoryResult> {
    const { userId, page = 1, limit = 20, from, to } = query;
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const filter: any = { userId };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const [requests, total] = await Promise.all([
      RequestLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      RequestLog.countDocuments(filter),
    ]);

    return {
      requests,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getMetrics(since?: Date): Promise<{
    totalRequests: number;
    tokensUsed: number;
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
          tokensUsed: { $sum: '$tokensUsed' },
          avgLatencyMs: { $avg: '$latencyMs' },
          successCount: { $sum: { $cond: ['$isSuccess', 1, 0] } },
        },
      },
    ]);

    if (result.length === 0) {
      return { totalRequests: 0, tokensUsed: 0, avgLatencyMs: 0, successRate: 100 };
    }

    const { totalRequests, tokensUsed, avgLatencyMs, successCount } = result[0];
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;

    return {
      totalRequests,
      tokensUsed,
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

  async getCreditsUsageByPeriod(userId?: string): Promise<{
    last1h: number;
    last24h: number;
    last7d: number;
    last30d: number;
  }> {
    const now = new Date();
    const hour1 = new Date(now.getTime() - 60 * 60 * 1000);
    const hours24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const match: any = {};
    if (userId) match.userId = userId;

    const [h1, h24, d7, d30] = await Promise.all([
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: hour1 } } },
        { $group: { _id: null, total: { $sum: '$creditsCost' } } },
      ]),
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: hours24 } } },
        { $group: { _id: null, total: { $sum: '$creditsCost' } } },
      ]),
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: days7 } } },
        { $group: { _id: null, total: { $sum: '$creditsCost' } } },
      ]),
      RequestLog.aggregate([
        { $match: { ...match, createdAt: { $gte: days30 } } },
        { $group: { _id: null, total: { $sum: '$creditsCost' } } },
      ]),
    ]);

    return {
      last1h: h1[0]?.total || 0,
      last24h: h24[0]?.total || 0,
      last7d: d7[0]?.total || 0,
      last30d: d30[0]?.total || 0,
    };
  }

  async getTotalCreditsBurned(since?: Date): Promise<number> {
    const match = since ? { createdAt: { $gte: since } } : {};
    const result = await RequestLog.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$creditsCost' } } },
    ]);
    return result[0]?.total || 0;
  }

  async getCreditsBurnedByUser(): Promise<Record<string, number>> {
    const result = await RequestLog.aggregate([
      { $group: { _id: '$userId', total: { $sum: '$creditsCost' } } },
    ]);
    const map: Record<string, number> = {};
    result.forEach((r) => {
      if (r._id) map[r._id] = r.total || 0;
    });
    return map;
  }
}

export const requestLogRepository = new RequestLogRepository();
