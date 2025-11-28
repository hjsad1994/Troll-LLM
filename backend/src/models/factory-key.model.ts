import mongoose from 'mongoose';

export interface IFactoryKey {
  _id: string;
  apiKey: string;
  status: 'healthy' | 'rate_limited' | 'exhausted' | 'error';
  tokensUsed: number;
  requestsCount: number;
  lastError?: string;
  cooldownUntil?: Date;
  createdAt: Date;
}

const factoryKeySchema = new mongoose.Schema({
  _id: { type: String, required: true },
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

export const FactoryKey = mongoose.model<IFactoryKey>('FactoryKey', factoryKeySchema, 'factory_keys');
