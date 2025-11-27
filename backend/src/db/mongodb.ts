import mongoose from 'mongoose';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function connectDB(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'fproxy',
    });
    console.log('✅ Connected to MongoDB successfully');
    
    // Seed default admin user
    await seedDefaultAdmin();
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Hash password with salt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

// User Key Schema
const userKeySchema = new mongoose.Schema({
  _id: { type: String, required: true }, // sk-dev-xxx or sk-pro-xxx
  name: { type: String, required: true },
  tier: { type: String, enum: ['dev', 'pro'], default: 'dev' },
  totalTokens: { type: Number, default: 30000000 }, // 30M default
  tokensUsed: { type: Number, default: 0 },
  requestsCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
  notes: { type: String },
});

// Virtual fields
userKeySchema.virtual('tokensRemaining').get(function() {
  return Math.max(0, this.totalTokens - this.tokensUsed);
});

userKeySchema.virtual('usagePercent').get(function() {
  if (this.totalTokens === 0) return 0;
  return (this.tokensUsed / this.totalTokens) * 100;
});

userKeySchema.virtual('isExhausted').get(function() {
  return this.tokensUsed >= this.totalTokens;
});

userKeySchema.set('toJSON', { virtuals: true });
userKeySchema.set('toObject', { virtuals: true });

// Factory Key Schema
const factoryKeySchema = new mongoose.Schema({
  _id: { type: String, required: true }, // factory-1, factory-2
  apiKey: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['healthy', 'rate_limited', 'exhausted', 'error'], 
    default: 'healthy' 
  },
  tokensUsed: { type: Number, default: 0 },
  requestsCount: { type: Number, default: 0 },
  lastError: { type: String },
  cooldownUntil: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Request Log Schema (with TTL)
const requestLogSchema = new mongoose.Schema({
  userKeyId: { type: String, required: true },
  factoryKeyId: { type: String, required: true },
  tokensUsed: { type: Number, required: true },
  statusCode: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 2592000 }, // 30 days TTL
});

// User Schema (Admin users)
const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // username
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
});

// Proxy Schema
const proxySchema = new mongoose.Schema({
  _id: { type: String, required: true }, // proxy-1, proxy-2
  name: { type: String, required: true },
  type: { type: String, enum: ['http', 'socks5'], required: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  username: { type: String },
  password: { type: String },
  status: { type: String, enum: ['healthy', 'unhealthy', 'unknown'], default: 'unknown' },
  lastLatencyMs: { type: Number },
  lastCheckedAt: { type: Date },
  lastError: { type: String },
  failCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Proxy Key Binding Schema
const proxyKeyBindingSchema = new mongoose.Schema({
  proxyId: { type: String, required: true, ref: 'Proxy' },
  factoryKeyId: { type: String, required: true, ref: 'FactoryKey' },
  priority: { type: Number, enum: [1, 2], default: 1 }, // 1 = primary, 2 = secondary
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
proxyKeyBindingSchema.index({ proxyId: 1, factoryKeyId: 1 }, { unique: true });
proxyKeyBindingSchema.index({ proxyId: 1, priority: 1 });

// Proxy Health Log Schema (with TTL)
const proxyHealthLogSchema = new mongoose.Schema({
  proxyId: { type: String, required: true },
  status: { type: String, enum: ['healthy', 'unhealthy', 'timeout', 'error'], required: true },
  latencyMs: { type: Number },
  errorMessage: { type: String },
  checkedAt: { type: Date, default: Date.now, expires: 604800 }, // 7 days TTL
});
proxyHealthLogSchema.index({ proxyId: 1, checkedAt: -1 });

export const UserKey = mongoose.model('UserKey', userKeySchema, 'user_keys');
export const FactoryKey = mongoose.model('FactoryKey', factoryKeySchema, 'factory_keys');
export const RequestLog = mongoose.model('RequestLog', requestLogSchema, 'request_logs');
export const User = mongoose.model('User', userSchema, 'users');
export const Proxy = mongoose.model('Proxy', proxySchema, 'proxies');
export const ProxyKeyBinding = mongoose.model('ProxyKeyBinding', proxyKeyBindingSchema, 'proxy_key_bindings');
export const ProxyHealthLog = mongoose.model('ProxyHealthLog', proxyHealthLogSchema, 'proxy_health_logs');

// Seed default admin user
async function seedDefaultAdmin(): Promise<void> {
  try {
    const existingAdmin = await User.findById('admin');
    if (!existingAdmin) {
      const { hash, salt } = hashPassword('admin');
      await User.create({
        _id: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Default admin user created (username: admin, password: admin)');
    }
  } catch (error) {
    console.error('⚠️ Failed to seed default admin:', error);
  }
}
