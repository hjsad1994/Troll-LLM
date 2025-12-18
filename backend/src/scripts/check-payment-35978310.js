const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  // Payment details
  const payment = await db.collection('payments').findOne({ sepayTransactionId: '35978310' });
  console.log('=== PAYMENT 35978310 ===');
  console.log('CompletedAt:', payment.completedAt);
  console.log('Credits Before:', payment.creditsBefore);
  console.log('Credits After:', payment.creditsAfter);
  console.log('Amount added:', payment.credits);

  // Calculate usage since this payment
  const paymentTime = payment.completedAt;
  console.log('\n=== USAGE SINCE PAYMENT ===');

  const usageSincePayment = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: paymentTime } } },
    { $group: {
      _id: null,
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 },
      totalInput: { $sum: '$inputTokens' },
      totalOutput: { $sum: '$outputTokens' }
    } }
  ]).toArray();

  if (usageSincePayment.length > 0) {
    console.log('Total requests:', usageSincePayment[0].count);
    console.log('Total cost from logs:', usageSincePayment[0].totalCost);
    console.log('Total input tokens:', usageSincePayment[0].totalInput);
    console.log('Total output tokens:', usageSincePayment[0].totalOutput);
  }

  // Current user state
  const user = await db.collection('usersNew').findOne({ _id: 'longcachep' });
  console.log('\n=== CURRENT USER STATE ===');
  console.log('Credits now:', user.credits);
  console.log('CreditsUsed now:', user.creditsUsed);

  // Analysis
  console.log('\n=== ANALYSIS ===');
  const creditsAfterPayment = payment.creditsAfter;
  const currentCredits = user.credits;
  const actualSpent = creditsAfterPayment - currentCredits;
  const loggedSpent = usageSincePayment[0]?.totalCost || 0;

  console.log('Credits after payment:', creditsAfterPayment.toFixed(4));
  console.log('Current credits:', currentCredits.toFixed(4));
  console.log('Actual spent (difference):', actualSpent.toFixed(4));
  console.log('Logged spent (from request_logs):', loggedSpent.toFixed(4));
  console.log('DISCREPANCY:', (actualSpent - loggedSpent).toFixed(4));

  if (Math.abs(actualSpent - loggedSpent) > 0.01) {
    console.log('\n⚠️  WARNING: There is a discrepancy between actual spent and logged spent!');
    console.log('This means credits are being deducted without proper logging.');
  } else {
    console.log('\n✅ Credits match request logs - no discrepancy');
  }

  // Breakdown by model
  console.log('\n=== BREAKDOWN BY MODEL (since payment) ===');
  const byModel = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: paymentTime } } },
    { $group: {
      _id: '$modelId',
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 }
    } },
    { $sort: { totalCost: -1 } }
  ]).toArray();

  byModel.forEach(m => {
    console.log(m._id || 'unknown', ':', m.count, 'requests, $' + m.totalCost.toFixed(4));
  });

  // Timeline - hourly breakdown
  console.log('\n=== HOURLY BREAKDOWN (since payment) ===');
  const hourly = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: paymentTime } } },
    { $group: {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      },
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 }
    } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]).toArray();

  hourly.forEach(h => {
    const dateStr = h._id.year + '-' + String(h._id.month).padStart(2, '0') + '-' +
                    String(h._id.day).padStart(2, '0') + ' ' +
                    String(h._id.hour).padStart(2, '0') + ':00';
    console.log(dateStr, ':', h.count, 'requests, $' + h.totalCost.toFixed(4));
  });

  await mongoose.disconnect();
}
check();
