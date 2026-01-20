// Test script to debug creditsNew period filtering
// Run: node test-creditsnew-filter.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trollllm';

async function testCreditsNewFilter() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();

  console.log('=== Testing creditsNew Period Filtering ===\n');

  // 1. Count total OpenHands RequestLogs
  const totalOpenHands = await db.collection('request_logs').countDocuments({ creditType: 'openhands' });
  console.log(`Total OpenHands RequestLogs: ${totalOpenHands}`);

  // 2. Check latest OpenHands requests
  const latest = await db.collection('request_logs')
    .find({ creditType: 'openhands' })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  console.log('\nLatest 5 OpenHands requests:');
  const now = new Date();
  latest.forEach((doc, i) => {
    const ageMinutes = (now - doc.createdAt) / (1000 * 60);
    console.log(`  ${i+1}. Age: ${ageMinutes.toFixed(0)} min, Cost: $${doc.creditsCost}, Created: ${doc.createdAt}`);
  });

  // 3. Count by period
  const periods = {
    '1h': 60 * 60 * 1000,
    '3h': 3 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  console.log('\nRequestLogs by period:');
  for (const [period, ms] of Object.entries(periods)) {
    const since = new Date(now.getTime() - ms);
    const count = await db.collection('request_logs').countDocuments({
      creditType: 'openhands',
      createdAt: { $gte: since }
    });

    const result = await db.collection('request_logs').aggregate([
      {
        $match: {
          creditType: 'openhands',
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          totalCreditsNewUsed: { $sum: '$creditsCost' }
        }
      }
    ]).toArray();

    const total = result[0]?.totalCreditsNewUsed || 0;
    console.log(`  ${period}: ${count} requests, $${total.toFixed(6)} burned`);
  }

  // 4. Check all period
  const allResult = await db.collection('request_logs').aggregate([
    {
      $match: {
        creditType: 'openhands'
      }
    },
    {
      $group: {
        _id: null,
        totalCreditsNewUsed: { $sum: '$creditsCost' }
      }
    }
  ]).toArray();

  const allTotal = allResult[0]?.totalCreditsNewUsed || 0;
  console.log(`  all: ${totalOpenHands} requests, $${allTotal.toFixed(6)} burned`);

  await client.close();
  console.log('\n=== Test Complete ===');
}

testCreditsNewFilter().catch(console.error);
