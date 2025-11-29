import { factoryKeyRepository, SafeFactoryKey } from '../repositories/factory-key.repository.js';
import { requestLogRepository } from '../repositories/request-log.repository.js';
import { IFactoryKey } from '../models/factory-key.model.js';

// Returns factory keys with masked apiKey - safe for API responses
export async function listFactoryKeys(): Promise<SafeFactoryKey[]> {
  return factoryKeyRepository.findAll();
}

// Returns single factory key with masked apiKey - safe for API responses
export async function getFactoryKey(id: string): Promise<SafeFactoryKey | null> {
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
