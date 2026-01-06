// OhMyGPT Database Setup Script
// Run this in MongoDB shell to set up indexes for OhMyGPT provider

// Switch to your database (default is "fproxy")
use fproxy;

// Create indexes for ohmygpt_keys collection
db.ohmygpt_keys.createIndex({ "status": 1 });
db.ohmygpt_keys.createIndex({ "cooldownUntil": 1 });
db.ohmygpt_keys.createIndex({ "createdAt": -1 });

// Create indexes for ohmygpt_bindings collection
db.ohmygpt_bindings.createIndex({ "proxyId": 1, "isActive": 1 });
db.ohmygpt_bindings.createIndex({ "ohmygptKeyId": 1 });

print("✅ OhMyGPT database indexes created successfully!");
print("");
print("Collections:");
print("- ohmygpt_keys: stores OhMyGPT API keys with status tracking");
print("- ohmygpt_bindings: stores proxy-to-key bindings for OhMyGPT");
print("");
print("To add a new OhMyGPT key, use:");
print(`
db.ohmygpt_keys.insertOne({
  "_id": "key-unique-id",
  "apiKey": "sk-your-ohmygpt-api-key",
  "status": "healthy",
  "tokensUsed": 0,
  "requestsCount": 0,
  "createdAt": new Date()
});
`);
