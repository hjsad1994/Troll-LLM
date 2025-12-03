import { Proxy, ProxyKeyBinding, ProxyHealthLog, FactoryKey } from '../db/mongodb.js';

export interface CreateProxyInput {
  name: string;
  type: 'http' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface UpdateProxyInput {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  isActive?: boolean;
}

let proxyCounter = 0;

export async function createProxy(input: CreateProxyInput) {
  // Generate unique ID
  const count = await Proxy.countDocuments();
  proxyCounter = Math.max(proxyCounter, count);
  const proxyId = `proxy-${++proxyCounter}`;

  const proxy = new Proxy({
    _id: proxyId,
    name: input.name,
    type: input.type,
    host: input.host,
    port: input.port,
    username: input.username,
    password: input.password,
    status: 'unknown',
  });

  await proxy.save();
  return sanitizeProxy(proxy.toJSON());
}

export async function listProxies() {
  const proxies = await Proxy.find().sort({ createdAt: -1 });
  return proxies.map(p => sanitizeProxy(p.toJSON()));
}

export async function getProxy(proxyId: string) {
  const proxy = await Proxy.findById(proxyId);
  return proxy ? sanitizeProxy(proxy.toJSON()) : null;
}

export async function updateProxy(proxyId: string, input: UpdateProxyInput) {
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.host !== undefined) updateData.host = input.host;
  if (input.port !== undefined) updateData.port = input.port;
  if (input.username !== undefined) updateData.username = input.username;
  if (input.password !== undefined) updateData.password = input.password;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const proxy = await Proxy.findByIdAndUpdate(
    proxyId,
    { $set: updateData },
    { new: true }
  );

  return proxy ? sanitizeProxy(proxy.toJSON()) : null;
}

export async function deleteProxy(proxyId: string) {
  // Delete all bindings first
  await ProxyKeyBinding.deleteMany({ proxyId });
  
  const result = await Proxy.findByIdAndDelete(proxyId);
  return result !== null;
}

// Key Bindings
export async function getProxyBindings(proxyId: string) {
  const bindings = await ProxyKeyBinding.find({ proxyId }).sort({ priority: 1 });
  
  // Get factory key details
  const result = [];
  for (const binding of bindings) {
    const factoryKey = await FactoryKey.findById(binding.factoryKeyId);
    result.push({
      id: binding._id,
      proxyId: binding.proxyId,
      factoryKeyId: binding.factoryKeyId,
      factoryKeyStatus: factoryKey?.status || 'unknown',
      priority: binding.priority,
      isActive: binding.isActive,
      createdAt: binding.createdAt,
    });
  }
  
  return result;
}

export async function bindKeyToProxy(proxyId: string, factoryKeyId: string, priority: number) {
  // Check proxy exists
  const proxy = await Proxy.findById(proxyId);
  if (!proxy) throw new Error('Proxy not found');

  // Check factory key exists
  const factoryKey = await FactoryKey.findById(factoryKeyId);
  if (!factoryKey) throw new Error('Factory key not found');

  // Check if already bound
  const existing = await ProxyKeyBinding.findOne({ proxyId, factoryKeyId });
  if (existing) throw new Error('Key already bound to this proxy');

  const binding = new ProxyKeyBinding({
    proxyId,
    factoryKeyId,
    priority,
  });

  await binding.save();
  return {
    id: binding._id,
    proxyId: binding.proxyId,
    factoryKeyId: binding.factoryKeyId,
    priority: binding.priority,
    createdAt: binding.createdAt,
  };
}

export async function updateBindingPriority(proxyId: string, factoryKeyId: string, priority: number) {
  return updateBinding(proxyId, factoryKeyId, { priority });
}

export async function updateBinding(proxyId: string, factoryKeyId: string, updates: { priority?: number; isActive?: boolean }) {
  const updateData: Record<string, unknown> = {};
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

  if (Object.keys(updateData).length === 0) return null;

  const binding = await ProxyKeyBinding.findOneAndUpdate(
    { proxyId, factoryKeyId },
    { $set: updateData },
    { new: true }
  );

  if (!binding) return null;

  return {
    id: binding._id,
    proxyId: binding.proxyId,
    factoryKeyId: binding.factoryKeyId,
    priority: binding.priority,
    isActive: binding.isActive,
    createdAt: binding.createdAt,
  };
}

// Get all bindings across all proxies (for overview page)
export async function getAllBindings() {
  // Show ALL bindings (including disabled) so admin can re-enable them
  const bindings = await ProxyKeyBinding.find().sort({ proxyId: 1, priority: 1 });
  const proxies = await Proxy.find();
  const factoryKeys = await FactoryKey.find();

  const proxyMap = new Map(proxies.map(p => [p._id, p]));
  const keyMap = new Map(factoryKeys.map(k => [k._id, k]));

  const result = [];
  for (const binding of bindings) {
    const proxy = proxyMap.get(binding.proxyId);
    const factoryKey = keyMap.get(binding.factoryKeyId);
    
    result.push({
      id: binding._id,
      proxyId: binding.proxyId,
      proxyName: proxy?.name || 'Unknown',
      factoryKeyId: binding.factoryKeyId,
      factoryKeyStatus: factoryKey?.status || 'unknown',
      priority: binding.priority,
      isActive: binding.isActive,
      createdAt: binding.createdAt,
    });
  }

  return result;
}

export async function unbindKeyFromProxy(proxyId: string, factoryKeyId: string) {
  const result = await ProxyKeyBinding.findOneAndDelete({ proxyId, factoryKeyId });
  return result !== null;
}

// Health logs
export async function getProxyHealthLogs(proxyId: string, limit = 100) {
  const logs = await ProxyHealthLog.find({ proxyId })
    .sort({ checkedAt: -1 })
    .limit(limit);
  return logs;
}

// Stats
export async function getProxyStats() {
  const total = await Proxy.countDocuments();
  const healthy = await Proxy.countDocuments({ status: 'healthy', isActive: true });
  const unhealthy = await Proxy.countDocuments({ status: 'unhealthy', isActive: true });
  const unknown = await Proxy.countDocuments({ status: 'unknown', isActive: true });
  const inactive = await Proxy.countDocuments({ isActive: false });

  return { total, healthy, unhealthy, unknown, inactive };
}

// Helper to sanitize proxy (hide password)
function sanitizeProxy(proxy: Record<string, unknown>) {
  const { password, ...rest } = proxy;
  return {
    ...rest,
    hasAuth: !!password,
  };
}
