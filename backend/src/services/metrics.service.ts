import { requestLogRepository } from '../repositories/request-log.repository.js';

export interface SystemMetrics {
  totalRequests: number;
  tokensUsed: number;
  avgLatencyMs: number;
  successRate: number;
  period: string;
}

export async function getSystemMetrics(period: string = 'all'): Promise<SystemMetrics> {
  let since: Date | undefined;
  
  switch (period) {
    case '1h':
      since = new Date(Date.now() - 60 * 60 * 1000);
      break;
    case '24h':
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      since = undefined;
  }

  const metrics = await requestLogRepository.getMetrics(since);
  
  return {
    ...metrics,
    period,
  };
}
