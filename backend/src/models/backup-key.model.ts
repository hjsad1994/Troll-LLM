import mongoose from 'mongoose';

export interface IBackupKey {
  _id: string;
  apiKey: string;
  isUsed: boolean;
  activated: boolean; // Key has been moved to troll_keys, can be deleted from backup
  createdAt: Date;
  usedAt?: Date;
  usedFor?: string; // Which key it replaced
}

const backupKeySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  apiKey: { type: String, required: true },
  isUsed: { type: Boolean, default: false },
  activated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  usedAt: { type: Date },
  usedFor: { type: String },
});

export const BackupKey = mongoose.model<IBackupKey>('BackupKey', backupKeySchema, 'backup_keys');
