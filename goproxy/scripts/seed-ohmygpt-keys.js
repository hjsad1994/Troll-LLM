// OhMyGPT Keys Seed Script
// This script adds initial OhMyGPT API keys to the database
//
// Usage:
// 1. Replace the placeholder keys below with your actual OhMyGPT API keys
// 2. Run: mongo <your-connection-string> seed-ohmygpt-keys.js

use fproxy;

// OhMyGPT API Keys to seed
// Replace these placeholders with your actual API keys
const ohmygptKeys = [
  {
    _id: "ohmygpt-key-001",
    apiKey: "sk-ohmygpt-key-1-placeholder-replace-me",
    status: "healthy",
    tokensUsed: 0,
    requestsCount: 0,
    createdAt: new Date()
  },
  {
    _id: "ohmygpt-key-002",
    apiKey: "sk-ohmygpt-key-2-placeholder-replace-me",
    status: "healthy",
    tokensUsed: 0,
    requestsCount: 0,
    createdAt: new Date()
  },
  {
    _id: "ohmygpt-key-003",
    apiKey: "sk-ohmygpt-key-3-placeholder-replace-me",
    status: "healthy",
    tokensUsed: 0,
    requestsCount: 0,
    createdAt: new Date()
  }
];

// Insert keys (ignore duplicates)
ohmygptKeys.forEach(key => {
  try {
    db.ohmygpt_keys.insertOne(key, { writeConcern: { w: 1 } });
    print(`✅ Inserted OhMyGPT key: ${key._id}`);
  } catch (e) {
    if (e.code === 11000) {
      print(`⚠️ Key ${key._id} already exists, skipping`);
    } else {
      print(`❌ Error inserting key ${key._id}: ${e}`);
    }
  }
});

print("");
print("📊 OhMyGPT keys seeded successfully!");
print(`Total keys in database: ${db.ohmygpt_keys.countDocuments({})}`);
