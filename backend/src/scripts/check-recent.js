const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  // Get last 1 hour logs
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Last 1h usage
  const last1h = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: oneHourAgo } } },
    { $group: { _id: null, totalCost: { $sum: '$creditsCost' }, count: { $sum: 1 } } }
  ]).toArray();
  console.log('Last 1 hour:', last1h);

  // Today usage
  const todayUsage = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: today } } },
    { $group: { _id: null, totalCost: { $sum: '$creditsCost' }, count: { $sum: 1 } } }
  ]).toArray();
  console.log('Today:', todayUsage);

  // Since payment #2 (Dec 18, 06:11)
  const paymentTime = new Date('2025-12-18T06:11:16.419Z');
  const sincePayment = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: paymentTime } } },
    { $group: { _id: null, totalCost: { $sum: '$creditsCost' }, count: { $sum: 1 } } }
  ]).toArray();
  console.log('Since last payment:', sincePayment);

  // Recent 10 logs details
  console.log('\n=== Recent 10 logs ===');
  const recentLogs = await db.collection('request_logs').find({ userId: 'longcachep' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  recentLogs.forEach((l, i) => {
    console.log((i + 1) + '.', l.createdAt.toISOString(), '| model:', l.modelId || l.model, '| cost:', l.creditsCost);
  });

  // Calculate expected vs actual
  console.log('\n=== ANALYSIS ===');
  const user = await db.collection('usersNew').findOne({ _id: 'longcachep' });
  const totalFromLogs = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep' } },
    { $group: { _id: null, totalCost: { $sum: '$creditsCost' } } }
  ]).toArray();

  console.log('User credits now:', user.credits);
  console.log('User creditsUsed (in DB):', user.creditsUsed);
  console.log('Total from request_logs:', totalFromLogs[0]?.totalCost);
  console.log('Difference (creditsUsed - logs):', user.creditsUsed - totalFromLogs[0]?.totalCost);

  // Payment #2 said creditsAfter = 108.53
  // If user has 74.86 now, then spent = 108.53 - 74.86 = 33.67 since payment
  console.log('\nPayment #2 creditsAfter: 108.53');
  console.log('Current credits:', user.credits);
  console.log('Spent since payment #2:', 108.53 - user.credits);
  console.log('Logged since payment #2:', sincePayment[0]?.totalCost || 0);

  await mongoose.disconnect();
}
check();
