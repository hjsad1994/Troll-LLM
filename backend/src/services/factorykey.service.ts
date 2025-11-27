import { FactoryKey, RequestLog } from '../db/mongodb.js';

export async function listFactoryKeys() {
  const keys = await FactoryKey.find().sort({ _id: 1 });
  return keys.map(k => ({
    id: k._id,
    apiKey: maskKey(k.apiKey), // Masked for security
    status: k.status,
    tokensUsed: k.tokensUsed,
    requestsCount: k.requestsCount,
    lastError: k.lastError,
    cooldownUntil: k.cooldownUntil,
    createdAt: k.createdAt,
  }));
}

function maskKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return key.substring(0, 7) + '***' + key.substring(key.length - 4);
}

export async function resetFactoryKeyStatus(keyId: string) {
  const key = await FactoryKey.findByIdAndUpdate(
    keyId,
    { 
      $set: { 
        status: 'healthy', 
        lastError: null, 
        cooldownUntil: null 
      } 
    },
    { new: true }
  );

  if (!key) return null;

  return {
    id: key._id,
    status: key.status,
    tokensUsed: key.tokensUsed,
    requestsCount: key.requestsCount,
  };
}

export async function getFactoryKeyStats() {
  const keys = await FactoryKey.find();
  
  const stats = {
    total: keys.length,
    healthy: 0,
    rate_limited: 0,
    exhausted: 0,
    error: 0,
  };

  for (const key of keys) {
    switch (key.status) {
      case 'healthy':
        stats.healthy++;
        break;
      case 'rate_limited':
        stats.rate_limited++;
        break;
      case 'exhausted':
        stats.exhausted++;
        break;
      case 'error':
        stats.error++;
        break;
    }
  }

  return stats;
}

export async function createFactoryKey(id: string, apiKey: string) {
  const key = new FactoryKey({
    _id: id,
    apiKey,
    status: 'healthy',
  });

  await key.save();
  return {
    id: key._id,
    status: key.status,
    createdAt: key.createdAt,
  };
}

export async function deleteFactoryKey(keyId: string) {
  const result = await FactoryKey.findByIdAndDelete(keyId);
  return result !== null;
}

export async function getTokenAnalytics(factoryKeyId?: string) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const matchStage: Record<string, unknown> = {};
  if (factoryKeyId) {
    matchStage.factoryKeyId = factoryKeyId;
  }

  // Aggregate tokens for each time period
  const aggregateForPeriod = async (since: Date) => {
    const result = await RequestLog.aggregate([
      { $match: { ...matchStage, createdAt: { $gte: since } } },
      { 
        $group: { 
          _id: null, 
          totalTokens: { $sum: '$tokensUsed' },
          totalRequests: { $sum: 1 }
        } 
      }
    ]);
    return result[0] || { totalTokens: 0, totalRequests: 0 };
  };

  const [stats1h, stats24h, stats7d] = await Promise.all([
    aggregateForPeriod(oneHourAgo),
    aggregateForPeriod(oneDayAgo),
    aggregateForPeriod(sevenDaysAgo),
  ]);

  return {
    tokens_1h: stats1h.totalTokens,
    tokens_24h: stats24h.totalTokens,
    tokens_7d: stats7d.totalTokens,
    requests_1h: stats1h.totalRequests,
    requests_24h: stats24h.totalRequests,
    requests_7d: stats7d.totalRequests,
  };
}
