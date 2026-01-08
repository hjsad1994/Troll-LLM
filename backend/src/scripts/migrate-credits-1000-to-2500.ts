#!/usr/bin/env ts-node

/**
 * Migration Script: User Credits Rate 1000 → 2500
 *
 * This script migrates user credits from the old billing rate (1,000 VND/$)
 * to the new billing rate (2,500 VND/$) for users who have not yet migrated.
 *
 * Formula: newCredits = oldCredits / 2.5
 *
 * Usage:
 *   npm run migrate-credits              # Dry run (preview only)
 *   npm run migrate-credits -- --apply   # Apply changes
 *
 * Author: Generated via OpenSpec proposal
 * Date: 2025-01-09
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ============================================================================
// CONSTANTS
// ============================================================================

const RATE_OLD = 1000;  // Old rate: 1000 VND per USD
const RATE_NEW = 2500;  // New rate: 2500 VND per USD
const RATE_RATIO = RATE_NEW / RATE_OLD;  // 2.5

// ============================================================================
// TYPES
// ============================================================================

interface UserNew {
  _id: string;
  credits: number;
  migration: boolean;
  role?: string;
  username?: string;
}

interface MigrationLog {
  userId: string;
  username: string;
  oldCredits: number;
  newCredits: number;
  migratedAt: Date;
  oldRate: number;
  newRate: number;
  autoMigrated: boolean;
}

interface MigrationResult {
  username: string;
  oldCredits: number;
  newCredits: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// MONGOOSE MODELS
// ============================================================================

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  credits: { type: Number, default: 0 },
  migration: { type: Boolean, default: false },
  role: { type: String },
  username: { type: String },
}, {
  strict: false,
  collection: 'usersNew'
});

const migrationLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  oldCredits: { type: Number, required: true },
  newCredits: { type: Number, required: true },
  migratedAt: { type: Date, default: Date.now },
  oldRate: { type: Number, required: true },
  newRate: { type: Number, required: true },
  autoMigrated: { type: Boolean, default: false },
}, {
  strict: false,
  collection: 'migration_logs'
});

const UserNew = mongoose.model<any>('UserNew', userSchema);
const MigrationLog = mongoose.model<any>('MigrationLog', migrationLogSchema);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate new credits from old credits using the rate ratio.
 * Formula: newCredits = oldCredits / 2.5
 * Preserves 4 decimal places for precision.
 */
function calculateNewCredits(oldCredits: number): number {
  const newCredits = oldCredits / RATE_RATIO;
  return Math.round(newCredits * 10000) / 10000;
}

/**
 * Format number as currency string.
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format table row with aligned columns.
 */
function formatTableRow(username: string, oldCredits: string, newCredits: string): string {
  const USERNAME_WIDTH = 30;
  const CREDITS_WIDTH = 18;
  return (
    username.padEnd(USERNAME_WIDTH) +
    oldCredits.padEnd(CREDITS_WIDTH) +
    newCredits
  );
}

/**
 * Print table header.
 */
function printTableHeader(): void {
  const USERNAME_WIDTH = 30;
  const CREDITS_WIDTH = 18;
  const separator = '─'.repeat(USERNAME_WIDTH + CREDITS_WIDTH * 2);

  console.log('\n' + separator);
  console.log(
    formatTableRow(
      'Username',
      'Old Credits',
      'New Credits'
    )
  );
  console.log(separator);
}

/**
 * Print table separator.
 */
function printTableSeparator(): void {
  const USERNAME_WIDTH = 30;
  const CREDITS_WIDTH = 18;
  console.log('─'.repeat(USERNAME_WIDTH + CREDITS_WIDTH * 2));
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

/**
 * Migrate a single user.
 */
async function migrateUser(user: UserNew): Promise<MigrationResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldCredits = user.credits || 0;
    const newCredits = calculateNewCredits(oldCredits);

    // Update user record
    await mongoose.connection.collection('usersNew').updateOne(
      { _id: user._id },
      {
        $set: {
          migration: true,
          credits: newCredits,
        }
      },
      { session }
    );

    // Create migration log
    await mongoose.connection.collection('migration_logs').insertOne(
      {
        userId: user._id,
        username: user.username || user._id,
        oldCredits: oldCredits,
        newCredits: newCredits,
        migratedAt: new Date(),
        oldRate: RATE_OLD,
        newRate: RATE_NEW,
        autoMigrated: false,  // Manual script migration
      } as MigrationLog,
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      username: user.username || user._id,
      oldCredits,
      newCredits,
      success: true,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    return {
      username: user.username || user._id,
      oldCredits: user.credits || 0,
      newCredits: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Display migration results summary.
 */
function displaySummary(
  users: UserNew[],
  results: MigrationResult[],
  dryRun: boolean
): void {
  const totalOldCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
  const totalNewCredits = users.reduce((sum, u) => sum + calculateNewCredits(u.credits || 0), 0);

  console.log('\n' + '═'.repeat(66));
  console.log('📋 SUMMARY:');
  console.log(`  Total users found: ${users.length}`);
  console.log(`  Total old credits: ${formatCurrency(totalOldCredits)}`);
  console.log(`  Total new credits: ${formatCurrency(totalNewCredits)}`);

  if (!dryRun && results.length > 0) {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n  Successfully migrated: ${successCount}`);
    if (failCount > 0) {
      console.log(`  Failed: ${failCount}`);
    }
    console.log(`  Credits reduced: ${formatCurrency(totalOldCredits - totalNewCredits)} (${Math.round((1 - totalNewCredits / totalOldCredits) * 100)}%)`);
  }

  console.log('═'.repeat(66));

  if (dryRun) {
    console.log('\n🔍 DRY RUN COMPLETE - No changes made');
    console.log('To apply: npm run migrate-credits -- --apply\n');
  } else {
    console.log('\n✅ MIGRATION COMPLETE\n');
  }
}

/**
 * Display migration results for apply mode.
 */
function displayResults(results: MigrationResult[]): void {
  console.log('\n' + '═'.repeat(66));
  console.log('📋 RESULTS:');
  console.log('═'.repeat(66));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`  Successfully migrated: ${successCount}`);
  if (failCount > 0) {
    console.log(`  Failed: ${failCount}`);
  }

  // Show failed users
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n❌ Failed migrations:');
    for (const failure of failures) {
      console.log(`  - ${failure.username}: ${failure.error}`);
    }
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  const mode = dryRun ? 'DRY RUN' : 'APPLY';
  console.log('═'.repeat(66));
  console.log(`=== MIGRATION SCRIPT (${mode}) ===`);
  console.log(`Rate: ${RATE_OLD} → ${RATE_NEW} VND/USD (÷${RATE_RATIO})`);
  console.log('═'.repeat(66));

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('\n❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'fproxy';
  console.log(`\n🔌 Connecting to MongoDB (database: ${dbName})...`);

  try {
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB\n');
  } catch (error: any) {
    console.error(`❌ Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }

  try {
    // Find users who need migration
    console.log('🔍 Searching for users with migration: false...\n');
    const users = await UserNew.find({ migration: false })
      .select('_id credits migration username')
      .lean()
      .exec();

    if (users.length === 0) {
      console.log('ℹ️  No users need migration. All users already have migration: true\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`📊 Found ${users.length} users with migration: false\n`);

    // Display affected users
    printTableHeader();
    for (const user of users) {
      const oldCredits = user.credits || 0;
      const newCredits = calculateNewCredits(oldCredits);
      console.log(formatTableRow(
        user.username || user._id,
        formatCurrency(oldCredits),
        formatCurrency(newCredits)
      ));
    }
    printTableSeparator();

    // Dry run: just display and exit
    if (dryRun) {
      displaySummary(users, [], true);
      await mongoose.disconnect();
      return;
    }

    // Apply mode: perform migration
    console.log('\n✏️  Processing migrations...\n');

    const results: MigrationResult[] = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const result = await migrateUser(user);
      results.push(result);

      // Display progress
      if (result.success) {
        console.log(`  ✓ Migrated: ${result.username} (${formatCurrency(result.oldCredits)} → ${formatCurrency(result.newCredits)})`);
      } else {
        console.log(`  ✗ Failed: ${result.username} - ${result.error}`);
      }

      // Progress indicator every 10 users
      if ((i + 1) % 10 === 0 || i === users.length - 1) {
        console.log(`  Progress: ${i + 1}/${users.length} users processed\n`);
      }
    }

    displayResults(results);
    displaySummary(users, results, false);

  } catch (error: any) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// ============================================================================
// SCRIPT ENTRY POINT
// ============================================================================

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
