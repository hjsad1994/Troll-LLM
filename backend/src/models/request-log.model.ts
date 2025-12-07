import mongoose from 'mongoose';

export interface IRequestLog {
  _id?: mongoose.Types.ObjectId;
  userId?: string;
  userKeyId: string;
  factoryKeyId: string;
  friendKeyId?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheHitTokens?: number;
  creditsCost?: number;
  tokensUsed: number;
  statusCode: number;
  latencyMs?: number;
  isSuccess: boolean;
  createdAt: Date;
}

const requestLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  userKeyId: { type: String, required: true },
  factoryKeyId: { type: String, required: true },
  friendKeyId: { type: String, index: true },
  model: { type: String },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  cacheWriteTokens: { type: Number, default: 0 },
  cacheHitTokens: { type: Number, default: 0 },
  creditsCost: { type: Number, default: 0 },
  tokensUsed: { type: Number, required: true },
  statusCode: { type: Number, required: true },
  latencyMs: { type: Number },
  isSuccess: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, expires: 2592000 },
});

requestLogSchema.index({ createdAt: -1 });
requestLogSchema.index({ userId: 1, createdAt: -1 });

export const RequestLog = mongoose.model<IRequestLog>('RequestLog', requestLogSchema, 'request_logs');
