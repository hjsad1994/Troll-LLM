// Quick script to add a single OhMyGPT key for testing
// Run: node goproxy/scripts/add-ohmygpt-test-key.js

const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0';
const DB_NAME = process.env.MONGODB_DB_NAME || 'fproxy';

async function addOhMyGPTTestKey() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection('ohmygpt_keys');

    // Check if key already exists
    const existing = await collection.findOne({ _id: 'ohmygpt-test-001' });
    if (existing) {
      console.log('⚠️ Key ohmygpt-test-001 already exists, updating...');
      await collection.updateOne(
        { _id: 'ohmygpt-test-001' },
        {
          $set: {
            apiKey: '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',
            status: 'healthy',
            updatedAt: new Date()
          }
        }
      );
    } else {
      await collection.insertOne({
        _id: 'ohmygpt-test-001',
        apiKey: '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',
        status: 'healthy',
        tokensUsed: 0,
        requestsCount: 0,
        createdAt: new Date()
      });
    }

    console.log('✅ OhMyGPT test key added successfully!');
    console.log('Key ID: ohmygpt-test-001');
    console.log('');
    console.log('Verify with:');
    console.log('  db.ohmygpt_keys.find({ _id: "ohmygpt-test-001" });');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addOhMyGPTTestKey();
