const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb+srv://trantai306_db_user:FHBuXtedXaFLBr22@cluster0.aa02bn1.mongodb.net/?appName=Cluster0');
  await client.connect();
  const db = client.db('fproxy');

  console.log('========== COLLECTION: usersNew ==========\n');

  const now = new Date();

  // 1. Expired users with credits > 0
  const expiredWithCredits = await db.collection('usersNew').find({
    $and: [
      { credits: { $gt: 0 } },
      {
        $or: [
          { expiresAt: null },
          { expiresAt: { $lt: now } }
        ]
      }
    ]
  }).project({ _id: 1, credits: 1, expiresAt: 1 }).toArray();

  console.log('=== EXPIRED USERS WITH CREDITS > 0 ===');
  console.log('Total:', expiredWithCredits.length);
  let totalCredits = 0;
  expiredWithCredits.forEach(u => {
    totalCredits += u.credits;
    console.log(`[EXPIRED] ${u._id}: credits=$${u.credits.toFixed(2)}, expires=${u.expiresAt ? u.expiresAt.toISOString() : 'null'}`);
  });
  console.log('\nTotal credits to cleanup: $' + totalCredits.toFixed(2));

  // 2. Expired users with credits = 0 but still have expiresAt
  const expiredZeroCredits = await db.collection('usersNew').find({
    credits: { $lte: 0 },
    expiresAt: { $ne: null, $lt: now }
  }).project({ _id: 1, credits: 1, expiresAt: 1, purchasedAt: 1 }).toArray();

  console.log('\n=== EXPIRED USERS WITH CREDITS = 0 (need cleanup) ===');
  console.log('Total:', expiredZeroCredits.length);
  expiredZeroCredits.slice(0, 20).forEach(u => {
    console.log(`[CLEANUP] ${u._id}: credits=${u.credits}, expires=${u.expiresAt.toISOString()}`);
  });
  if (expiredZeroCredits.length > 20) console.log(`... and ${expiredZeroCredits.length - 20} more`);

  // 3. Active users (not expired, credits > 0)
  const activeUsers = await db.collection('usersNew').find({
    credits: { $gt: 0 },
    expiresAt: { $gte: now }
  }).project({ _id: 1, credits: 1, expiresAt: 1 }).toArray();

  console.log('\n=== ACTIVE USERS (credits > 0, not expired) ===');
  console.log('Total:', activeUsers.length);

  await client.close();
}
check().catch(console.error);
