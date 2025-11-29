import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function connectDB(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'fproxy',
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

// Re-export for backward compatibility
export { User, hashPassword, verifyPassword } from '../models/user.model.js';
export { UserKey } from '../models/user-key.model.js';
export { FactoryKey } from '../models/factory-key.model.js';
export { RequestLog } from '../models/request-log.model.js';
export { Proxy, ProxyKeyBinding, ProxyHealthLog } from '../models/proxy.model.js';
