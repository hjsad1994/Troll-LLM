import { userNewRepository } from '../repositories/user-new.repository.js';

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export interface MigrationResult {
  success: boolean;
  oldCredits: number;
  newCredits: number;
  message: string;
}

export class MigrationService {
  async processMigration(userId: string): Promise<MigrationResult> {
    // Validate user exists
    const user = await userNewRepository.findById(userId);
    if (!user) {
      throw new MigrationError('User not found');
    }

    // Check if already migrated
    if (user.migration) {
      throw new MigrationError('User has already migrated');
    }

    // Perform migration
    const result = await userNewRepository.setMigrated(userId);

    if (!result) {
      throw new MigrationError('Migration failed - user may already be migrated');
    }

    return {
      success: true,
      oldCredits: result.oldCredits,
      newCredits: result.newCredits,
      message: `Successfully migrated from ${result.oldCredits.toFixed(2)} to ${result.newCredits.toFixed(2)} credits`,
    };
  }

  async getMigrationStatus(userId: string): Promise<boolean> {
    return userNewRepository.getMigrationStatus(userId);
  }
}

export const migrationService = new MigrationService();
