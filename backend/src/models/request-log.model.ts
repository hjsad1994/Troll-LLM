import mongoose from 'mongoose';

export interface IRequestLog {
  _id?: mongoose.Types.ObjectId;
  userKeyId: string;
  factoryKeyId: string;
  tokensUsed: number;
  statusCode: number;
  latencyMs?: number;
  isSuccess: boolean;
  createdAt: Date;
}

const requestLogSchema = new mongoose.Schema({
  userKeyId: { type: String, required: true },
  factoryKeyId: { type: String, required: true },
  tokensUsed: { type: Number, required: true },
  statusCode: { type: Number, required: true },
  latencyMs: { type: Number },
  isSuccess: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, expires: 2592000 },
});

requestLogSchema.index({ createdAt: -1 });

export const RequestLog = mongoose.model<IRequestLog>('RequestLog', requestLogSchema, 'request_logs');
