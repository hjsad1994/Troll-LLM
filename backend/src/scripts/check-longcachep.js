const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  // Full payment details
  const payments = await db.collection('payments').find({ userId: 'longcachep' }).sort({ createdAt: -1 }).toArray();
  console.log('=== PAYMENTS for longcachep ===');
  payments.forEach((p, i) => {
    console.log('[' + (i+1) + ']', JSON.stringify(p, null, 2));
  });

  // Sum all payments
  const totalVND = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  console.log('\nTotal VND paid:', totalVND);
  console.log('Credits at 4000 VND/USD:', totalVND / 4000);

  // User info
  console.log('\n=== USER INFO ===');
  const user = await db.collection('usersNew').findOne({ _id: 'longcachep' });
  console.log('Credits:', user.credits);
  console.log('Credits Used:', user.creditsUsed);
  console.log('Initial Credits:', user.initialCredits);

  // Total from logs
  const agg = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep' } },
    { $group: { _id: null, totalCost: { $sum: '$creditsCost' }, count: { $sum: 1 } } }
  ]).toArray();
  console.log('\n=== REQUEST LOGS TOTAL ===');
  console.log('Total requests:', agg[0]?.count);
  console.log('Total cost from logs:', agg[0]?.totalCost);

  // Analysis
  console.log('\n=== ANALYSIS ===');
  const creditsFromPayments = totalVND / 4000;
  const initialCredits = user.initialCredits || 0;
  const totalCreditsAdded = creditsFromPayments + initialCredits;
  const expectedBalance = totalCreditsAdded - (agg[0]?.totalCost || 0);

  console.log('Initial Credits:', initialCredits);
  console.log('Credits from payments:', creditsFromPayments);
  console.log('Total credits added:', totalCreditsAdded);
  console.log('Total used (from logs):', agg[0]?.totalCost);
  console.log('Expected balance:', expectedBalance);
  console.log('Actual balance:', user.credits);
  console.log('Difference:', user.credits - expectedBalance);

  await mongoose.disconnect();
}
check();
