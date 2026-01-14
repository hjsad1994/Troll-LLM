// Script to check OpenHands backup keys cleanup status
// Run with: node scripts/check-backup-keys-cleanup.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trollllm';

async function checkBackupKeys() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('openhands_backup_keys');

    // Get all used keys
    const usedKeys = await collection.find({ isUsed: true }).toArray();
    console.log(`\n📊 Found ${usedKeys.length} used backup keys\n`);

    const now = new Date();
    const cutoff6h = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const cutoff12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`⏰ 6h cutoff: ${cutoff6h.toISOString()}`);
    console.log(`⏰ 12h cutoff: ${cutoff12h.toISOString()}\n`);

    let shouldDelete6h = 0;
    let shouldDelete12h = 0;
    let missingUsedAt = 0;

    usedKeys.forEach((key, index) => {
      console.log(`\n--- Key ${index + 1}: ${key._id} ---`);
      console.log(`  isUsed: ${key.isUsed}`);
      console.log(`  activated: ${key.activated}`);
      console.log(`  usedFor: ${key.usedFor || 'N/A'}`);

      if (key.usedAt) {
        const usedAt = new Date(key.usedAt);
        const ageMs = now.getTime() - usedAt.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);

        console.log(`  usedAt: ${usedAt.toISOString()}`);
        console.log(`  Age: ${ageHours.toFixed(2)} hours`);

        if (usedAt < cutoff6h) {
          console.log(`  ⚠️ SHOULD BE DELETED (> 6h old)`);
          shouldDelete6h++;
        } else if (usedAt < cutoff12h) {
          console.log(`  ⚠️ Would be deleted under old 12h policy`);
          shouldDelete12h++;
        } else {
          console.log(`  ✅ OK (< 6h old, will be deleted later)`);
        }
      } else {
        console.log(`  ❌ ERROR: Missing usedAt field!`);
        missingUsedAt++;
      }
    });

    console.log(`\n\n=== SUMMARY ===`);
    console.log(`Total used keys: ${usedKeys.length}`);
    console.log(`Keys that SHOULD be deleted (>6h): ${shouldDelete6h}`);
    console.log(`Keys with missing usedAt field: ${missingUsedAt}`);

    if (shouldDelete6h > 0) {
      console.log(`\n⚠️ WARNING: ${shouldDelete6h} keys are older than 6 hours and should have been deleted by the cleanup job!`);
      console.log(`\nPossible issues:`);
      console.log(`1. Cleanup job not running (check goproxy logs for "Started backup key cleanup job")`);
      console.log(`2. Database connection issue in goproxy`);
      console.log(`3. usedAt field type mismatch`);

      console.log(`\n🔧 To manually delete these keys, run:`);
      console.log(`db.openhands_backup_keys.deleteMany({ isUsed: true, usedAt: { $lt: ISODate("${cutoff6h.toISOString()}") } })`);
    } else if (usedKeys.length === 0) {
      console.log(`\n✅ No used backup keys found - system is clean!`);
    } else {
      console.log(`\n✅ All used keys are within the 6-hour window - cleanup is working correctly!`);
    }

    if (missingUsedAt > 0) {
      console.log(`\n⚠️ WARNING: ${missingUsedAt} keys are missing the usedAt field!`);
      console.log(`These keys will NOT be auto-deleted. They need to be fixed or manually deleted.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkBackupKeys();
