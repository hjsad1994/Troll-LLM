import * as fs from 'fs';
import * as path from 'path';

export interface ModelConfig {
  name: string;
  id: string;
  type: string;
  reasoning?: string;
  input_price_per_mtok: number;
  output_price_per_mtok: number;
  upstream?: string;
}

export interface ModelHealth {
  id: string;
  name: string;
  type: string;
  isHealthy: boolean;
  lastCheckedAt: string;
  latencyMs?: number;
  error?: string;
}

interface GoproxyConfig {
  models: ModelConfig[];
  endpoints: { name: string; base_url: string }[];
}

let cachedConfig: GoproxyConfig | null = null;
let lastConfigLoad = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

function loadGoproxyConfig(): GoproxyConfig | null {
  const now = Date.now();
  if (cachedConfig && now - lastConfigLoad < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  // Try multiple possible paths for goproxy config
  const possiblePaths = [
    // Environment variable path (highest priority)
    process.env.GOPROXY_CONFIG_PATH,
    // Production paths
    '/app/goproxy/config.json',
    '/app/goproxy/config.prod.json',
    // Development paths
    path.resolve(__dirname, '../../../goproxy/config.json'),
    path.resolve(__dirname, '../../goproxy/config.json'),
    path.resolve(process.cwd(), '../goproxy/config.json'),
    path.resolve(process.cwd(), 'goproxy/config.json'),
  ].filter(Boolean) as string[];

  for (const configPath of possiblePaths) {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        cachedConfig = JSON.parse(data);
        lastConfigLoad = now;
        console.log(`Loaded goproxy config from: ${configPath}`);
        return cachedConfig;
      }
    } catch (err) {
      console.error(`Failed to load config from ${configPath}:`, err);
    }
  }

  console.warn('Could not find goproxy config.json');
  return null;
}

export function getModels(): ModelConfig[] {
  const config = loadGoproxyConfig();
  return config?.models || [];
}

export async function checkModelHealth(model: ModelConfig): Promise<ModelHealth> {
  const startTime = Date.now();
  const config = loadGoproxyConfig();
  
  // Find endpoint for this model type
  const endpoint = config?.endpoints.find(e => e.name === model.type);
  
  if (!endpoint) {
    return {
      id: model.id,
      name: model.name,
      type: model.type,
      isHealthy: false,
      lastCheckedAt: new Date().toISOString(),
      error: 'No endpoint configured for this model type',
    };
  }

  try {
    // Simple HEAD/GET request to check if endpoint is reachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpoint.base_url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'TrollLLM-HealthCheck/1.0',
      },
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    // Consider 2xx, 3xx, 4xx as "reachable" (endpoint is up)
    // Only 5xx or network errors indicate unhealthy
    const isHealthy = response.status < 500;

    return {
      id: model.id,
      name: model.name,
      type: model.type,
      isHealthy,
      lastCheckedAt: new Date().toISOString(),
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      id: model.id,
      name: model.name,
      type: model.type,
      isHealthy: false,
      lastCheckedAt: new Date().toISOString(),
      latencyMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getAllModelsHealth(): Promise<ModelHealth[]> {
  const models = getModels();
  
  // Check health for all models in parallel
  const healthResults = await Promise.all(
    models.map(model => checkModelHealth(model))
  );

  return healthResults;
}
