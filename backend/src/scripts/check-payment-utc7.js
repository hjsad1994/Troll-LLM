const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  // Payment details
  const payment = await db.collection('payments').findOne({ sepayTransactionId: '35978310' });

  // Convert to UTC+7
  const completedAtUTC = new Date(payment.completedAt);
  const completedAtVN = new Date(completedAtUTC.getTime() + 7 * 60 * 60 * 1000);

  // Current time in UTC+7 (user said 20:52)
  const currentTimeVN = new Date('2025-12-18T20:52:00+07:00');
  const currentTimeUTC = new Date(currentTimeVN.getTime() - 7 * 60 * 60 * 1000);

  console.log('=== PAYMENT 35978310 ===');
  console.log('CompletedAt (UTC):', payment.completedAt);
  console.log('CompletedAt (UTC+7):', completedAtVN.toISOString().replace('T', ' ').substring(0, 19));
  console.log('Current time (UTC+7):', '2025-12-18 20:52:00');
  console.log('Credits Before:', payment.creditsBefore);
  console.log('Credits After:', payment.creditsAfter);

  // Calculate usage since this payment
  const paymentTime = payment.completedAt;

  const usageSincePayment = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: paymentTime, $lte: currentTimeUTC } } },
    { $group: {
      _id: null,
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 },
      totalInput: { $sum: '$inputTokens' },
      totalOutput: { $sum: '$outputTokens' }
    } }
  ]).toArray();

  console.log('\n=== USAGE SINCE PAYMENT ===');
  if (usageSincePayment.length > 0) {
    console.log('Total requests:', usageSincePayment[0].count);
    console.log('Total cost from logs:', usageSincePayment[0].totalCost.toFixed(4));
    console.log('Total input tokens:', usageSincePayment[0].totalInput);
    console.log('Total output tokens:', usageSincePayment[0].totalOutput);
  }

  // Current user state
  const user = await db.collection('usersNew').findOne({ _id: 'longcachep' });
  console.log('\n=== CURRENT USER STATE ===');
  console.log('Credits now:', user.credits.toFixed(4));

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

  // Hourly breakdown in UTC+7
  console.log('\n=== HOURLY BREAKDOWN (UTC+7) ===');
  const hourly = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: paymentTime, $lte: currentTimeUTC } } },
    { $addFields: {
      createdAtVN: { $dateAdd: { startDate: '$createdAt', unit: 'hour', amount: 7 } }
    }},
    { $group: {
      _id: {
        year: { $year: '$createdAtVN' },
        month: { $month: '$createdAtVN' },
        day: { $dayOfMonth: '$createdAtVN' },
        hour: { $hour: '$createdAtVN' }
      },
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 }
    } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]).toArray();

  let runningTotal = 0;
  hourly.forEach(h => {
    const dateStr = h._id.day + '/' + h._id.month + '/' + h._id.year + ' ' +
                    String(h._id.hour).padStart(2, '0') + ':00';
    runningTotal += h.totalCost;
    console.log(dateStr, ':', h.count, 'requests, $' + h.totalCost.toFixed(4), '(tổng: $' + runningTotal.toFixed(4) + ')');
  });

  // Duration
  const durationMs = currentTimeUTC - completedAtUTC;
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  console.log('\nThời gian sử dụng:', durationHours, 'giờ', durationMins, 'phút');

  await mongoose.disconnect();
}
check();
