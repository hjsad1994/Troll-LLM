import { BackupKey, IBackupKey } from '../models/backup-key.model.js';

export const backupKeyRepository = {
  async findAll(): Promise<IBackupKey[]> {
    return BackupKey.find().sort({ createdAt: -1 });
  },

  async findAvailable(): Promise<IBackupKey[]> {
    return BackupKey.find({ isUsed: false }).sort({ createdAt: 1 });
  },

  async findUsed(): Promise<IBackupKey[]> {
    return BackupKey.find({ isUsed: true }).sort({ usedAt: -1 });
  },

  async findById(id: string): Promise<IBackupKey | null> {
    return BackupKey.findById(id);
  },

  async create(data: { id: string; apiKey: string }): Promise<IBackupKey> {
    const key = new BackupKey({
      _id: data.id,
      apiKey: data.apiKey,
      isUsed: false,
      createdAt: new Date(),
    });
    return key.save();
  },

  async delete(id: string): Promise<boolean> {
    const result = await BackupKey.deleteOne({ _id: id });
    return result.deletedCount > 0;
  },

  async markAsUsed(id: string, usedFor: string): Promise<IBackupKey | null> {
    return BackupKey.findByIdAndUpdate(
      id,
      { isUsed: true, usedAt: new Date(), usedFor },
      { new: true }
    );
  },

  async markAsAvailable(id: string): Promise<IBackupKey | null> {
    return BackupKey.findByIdAndUpdate(
      id,
      { isUsed: false, usedAt: null, usedFor: null },
      { new: true }
    );
  },

  async getStats() {
    const total = await BackupKey.countDocuments();
    const available = await BackupKey.countDocuments({ isUsed: false });
    const used = await BackupKey.countDocuments({ isUsed: true });
    return { total, available, used };
  },
};
