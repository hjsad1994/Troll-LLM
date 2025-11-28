import { factoryKeyRepository } from '../repositories/factory-key.repository.js';
import { requestLogRepository } from '../repositories/request-log.repository.js';
import { IFactoryKey } from '../models/factory-key.model.js';

export async function listFactoryKeys(): Promise<IFactoryKey[]> {
  return factoryKeyRepository.findAll();
}

export async function getFactoryKey(id: string): Promise<IFactoryKey | null> {
  return factoryKeyRepository.findById(id);
}

export async function createFactoryKey(id: string, apiKey: string): Promise<IFactoryKey> {
  return factoryKeyRepository.create(id, apiKey);
}

export async function deleteFactoryKey(id: string): Promise<boolean> {
  return factoryKeyRepository.delete(id);
}

export async function resetFactoryKeyStatus(id: string): Promise<IFactoryKey | null> {
  return factoryKeyRepository.resetStatus(id);
}

export async function getFactoryKeyStats(): Promise<{ total: number; healthy: number; unhealthy: number }> {
  return factoryKeyRepository.getStats();
}

export async function getTokenAnalytics(factoryKeyId?: string): Promise<{
  last1h: number;
  last24h: number;
  last7d: number;
}> {
  return requestLogRepository.getTokenAnalytics(factoryKeyId);
}
