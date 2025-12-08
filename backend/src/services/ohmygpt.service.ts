import mongoose from 'mongoose';

export interface OhmyGPTKey {
  _id: string;
  apiKey: string;
  status: string;
  tokensUsed: number;
  requestsCount: number;
  lastError?: string;
  cooldownUntil?: Date;
  createdAt: Date;
}

export interface OhmyGPTKeyBinding {
  _id?: any;
  proxyId: string;
  ohmygptKeyId: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Proxy {
  _id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  status: string;
  isActive: boolean;
}

function getCollection(name: string) {
  return mongoose.connection.db!.collection(name);
}

// Keys
export async function listKeys(): Promise<OhmyGPTKey[]> {
  const result = await getCollection('ohmygpt_keys').find({}).toArray();
  return result as any;
}

export async function getKey(id: string): Promise<OhmyGPTKey | null> {
  const result = await getCollection('ohmygpt_keys').findOne({ _id: id as any });
  return result as any;
}

export async function createKey(data: { id: string; apiKey: string }): Promise<OhmyGPTKey> {
  const key = {
    _id: data.id,
    apiKey: data.apiKey,
    status: 'healthy',
    tokensUsed: 0,
    requestsCount: 0,
    createdAt: new Date(),
  };
  await getCollection('ohmygpt_keys').insertOne(key as any);
  return key as any;
}

export async function updateKey(id: string, data: Partial<OhmyGPTKey>): Promise<OhmyGPTKey | null> {
  const result = await getCollection('ohmygpt_keys').findOneAndUpdate(
    { _id: id as any },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return result as any;
}

export async function deleteKey(id: string): Promise<boolean> {
  await getCollection('ohmygpt_key_bindings').deleteMany({ ohmygptKeyId: id });
  const result = await getCollection('ohmygpt_keys').deleteOne({ _id: id as any });
  return result.deletedCount > 0;
}

export async function resetKeyStats(id: string): Promise<OhmyGPTKey | null> {
  const result = await getCollection('ohmygpt_keys').findOneAndUpdate(
    { _id: id as any },
    { $set: { status: 'healthy', tokensUsed: 0, requestsCount: 0, lastError: null, cooldownUntil: null } },
    { returnDocument: 'after' }
  );
  return result as any;
}

// Bindings
export async function listBindings(): Promise<OhmyGPTKeyBinding[]> {
  const result = await getCollection('ohmygpt_key_bindings').find({}).sort({ proxyId: 1, priority: 1 }).toArray();
  return result as any;
}

export async function getBindingsForProxy(proxyId: string): Promise<OhmyGPTKeyBinding[]> {
  const result = await getCollection('ohmygpt_key_bindings').find({ proxyId }).sort({ priority: 1 }).toArray();
  return result as any;
}

export async function createBinding(data: { proxyId: string; ohmygptKeyId: string; priority: number }): Promise<OhmyGPTKeyBinding> {
  const binding = {
    proxyId: data.proxyId,
    ohmygptKeyId: data.ohmygptKeyId,
    priority: data.priority,
    isActive: true,
    createdAt: new Date(),
  };
  const result = await getCollection('ohmygpt_key_bindings').insertOne(binding);
  return { ...binding, _id: result.insertedId } as any;
}

export async function updateBinding(proxyId: string, ohmygptKeyId: string, data: Partial<OhmyGPTKeyBinding>): Promise<OhmyGPTKeyBinding | null> {
  const result = await getCollection('ohmygpt_key_bindings').findOneAndUpdate(
    { proxyId, ohmygptKeyId },
    { $set: data },
    { returnDocument: 'after' }
  );
  return result as any;
}

export async function deleteBinding(proxyId: string, ohmygptKeyId: string): Promise<boolean> {
  const result = await getCollection('ohmygpt_key_bindings').deleteOne({ proxyId, ohmygptKeyId });
  return result.deletedCount > 0;
}

export async function deleteAllBindingsForProxy(proxyId: string): Promise<number> {
  const result = await getCollection('ohmygpt_key_bindings').deleteMany({ proxyId });
  return result.deletedCount;
}

// Proxies (read-only)
export async function listProxies(): Promise<Proxy[]> {
  const result = await getCollection('proxies').find({}).toArray();
  return result as any;
}

// Stats
export async function getStats() {
  const [keys, bindings, proxies, healthyKeys] = await Promise.all([
    getCollection('ohmygpt_keys').countDocuments(),
    getCollection('ohmygpt_key_bindings').countDocuments({ isActive: true }),
    getCollection('proxies').countDocuments({ isActive: true }),
    getCollection('ohmygpt_keys').countDocuments({ status: 'healthy' }),
  ]);
  
  return { totalKeys: keys, healthyKeys, totalBindings: bindings, totalProxies: proxies };
}
