// OhMyGPT Backup Keys Seed Script
// This script adds backup OhMyGPT API keys for automatic rotation
//
// When an active OhMyGPT key fails (401, 402, 403, budget_exceeded),
// the system will automatically replace it with a backup key from this pool.

use fproxy;

// OhMyGPT Backup API Keys to seed
// Replace these placeholders with your actual backup API keys
const ohmygptBackupKeys = [
  {
    _id: "ohmygpt-backup-001",
    apiKey: "sk-ohmygpt-backup-1-placeholder-replace-me",
    isUsed: false,
    activated: false,
    createdAt: new Date()
  },
  {
    _id: "ohmygpt-backup-002",
    apiKey: "sk-ohmygpt-backup-2-placeholder-replace-me",
    isUsed: false,
    activated: false,
    createdAt: new Date()
  },
  {
    _id: "ohmygpt-backup-003",
    apiKey: "sk-ohmygpt-backup-3-placeholder-replace-me",
    isUsed: false,
    activated: false,
    createdAt: new Date()
  },
  {
    _id: "ohmygpt-backup-004",
    apiKey: "sk-ohmygpt-backup-4-placeholder-replace-me",
    isUsed: false,
    activated: false,
    createdAt: new Date()
  },
  {
    _id: "ohmygpt-backup-005",
    apiKey: "sk-ohmygpt-backup-5-placeholder-replace-me",
    isUsed: false,
    activated: false,
    createdAt: new Date()
  }
];

// Create ohmygpt_backup_keys collection and insert keys
ohmygptBackupKeys.forEach(key => {
  try {
    db.ohmygpt_backup_keys.insertOne(key, { writeConcern: { w: 1 } });
    print(`✅ Inserted OhMyGPT backup key: ${key._id}`);
  } catch (e) {
    if (e.code === 11000) {
      print(`⚠️ Backup key ${key._id} already exists, skipping`);
    } else {
      print(`❌ Error inserting backup key ${key._id}: ${e}`);
    }
  }
});

// Create index for faster queries
db.ohmygpt_backup_keys.createIndex({ "isUsed": 1 });

print("");
print("📊 OhMyGPT backup keys seeded successfully!");
print(`Total backup keys available: ${db.ohmygpt_backup_keys.countDocuments({ isUsed: false })}`);
print("");
print("💡 These backup keys will be used automatically when active keys fail.");
