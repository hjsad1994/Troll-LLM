const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  // Payment details
  const payment = await db.collection('payments').findOne({ sepayTransactionId: '35978310' });

  // Payment completed at UTC
  const completedAtUTC = new Date(payment.completedAt);

  console.log('=== PAYMENT 35978310 ===');
  console.log('CompletedAt (UTC):', completedAtUTC.toISOString());
  console.log('CompletedAt (UTC+7):', formatVN(completedAtUTC));
  console.log('Current time (UTC+7): 18/12/2025 20:52:00');
  console.log('Credits Before: $' + payment.creditsBefore.toFixed(4));
  console.log('Credits After: $' + payment.creditsAfter.toFixed(4));

  // Get ALL usage since payment (no upper bound)
  const usageSincePayment = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: completedAtUTC } } },
    { $group: {
      _id: null,
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 },
      totalInput: { $sum: '$inputTokens' },
      totalOutput: { $sum: '$outputTokens' },
      firstRequest: { $min: '$createdAt' },
      lastRequest: { $max: '$createdAt' }
    } }
  ]).toArray();

  console.log('\n=== SỬ DỤNG TỪ SAU KHI NẠP ===');
  if (usageSincePayment.length > 0) {
    const u = usageSincePayment[0];
    console.log('Tổng số requests:', u.count);
    console.log('Tổng chi phí:', '$' + u.totalCost.toFixed(4));
    console.log('Tổng input tokens:', u.totalInput.toLocaleString());
    console.log('Tổng output tokens:', u.totalOutput.toLocaleString());
    console.log('Request đầu tiên:', formatVN(u.firstRequest));
    console.log('Request cuối cùng:', formatVN(u.lastRequest));
  }

  // Current user state
  const user = await db.collection('usersNew').findOne({ _id: 'longcachep' });
  console.log('\n=== TRẠNG THÁI HIỆN TẠI ===');
  console.log('Credits hiện có: $' + user.credits.toFixed(4));

  // Analysis
  console.log('\n=== ĐỐI CHIẾU ===');
  const creditsAfterPayment = payment.creditsAfter;
  const currentCredits = user.credits;
  const actualSpent = creditsAfterPayment - currentCredits;
  const loggedSpent = usageSincePayment[0]?.totalCost || 0;

  console.log('Credits sau nạp: $' + creditsAfterPayment.toFixed(4));
  console.log('Credits hiện tại: $' + currentCredits.toFixed(4));
  console.log('Đã dùng (tính từ chênh lệch): $' + actualSpent.toFixed(4));
  console.log('Đã dùng (từ request_logs): $' + loggedSpent.toFixed(4));
  console.log('CHÊNH LỆCH: $' + (actualSpent - loggedSpent).toFixed(4));

  // Hourly breakdown in UTC+7
  console.log('\n=== CHI TIẾT THEO GIỜ (UTC+7) ===');
  const hourly = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: completedAtUTC } } },
    { $group: {
      _id: {
        year: { $year: { $dateAdd: { startDate: '$createdAt', unit: 'hour', amount: 7 } } },
        month: { $month: { $dateAdd: { startDate: '$createdAt', unit: 'hour', amount: 7 } } },
        day: { $dayOfMonth: { $dateAdd: { startDate: '$createdAt', unit: 'hour', amount: 7 } } },
        hour: { $hour: { $dateAdd: { startDate: '$createdAt', unit: 'hour', amount: 7 } } }
      },
      totalCost: { $sum: '$creditsCost' },
      count: { $sum: 1 }
    } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]).toArray();

  let runningTotal = 0;
  hourly.forEach(h => {
    const dateStr = String(h._id.day).padStart(2, '0') + '/' +
                    String(h._id.month).padStart(2, '0') + '/' + h._id.year + ' ' +
                    String(h._id.hour).padStart(2, '0') + ':00';
    runningTotal += h.totalCost;
    console.log(dateStr + ' | ' + String(h.count).padStart(4) + ' requests | $' + h.totalCost.toFixed(4).padStart(8) + ' | Tổng: $' + runningTotal.toFixed(4));
  });

  // Duration calculation
  if (usageSincePayment.length > 0 && usageSincePayment[0].lastRequest) {
    const lastReq = new Date(usageSincePayment[0].lastRequest);
    const durationMs = lastReq - completedAtUTC;
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    console.log('\nThời gian sử dụng (từ nạp đến request cuối):', durationHours, 'giờ', durationMins, 'phút');
  }

  await mongoose.disconnect();
}

function formatVN(date) {
  const d = new Date(date);
  d.setHours(d.getHours() + 7);
  return String(d.getDate()).padStart(2, '0') + '/' +
         String(d.getMonth() + 1).padStart(2, '0') + '/' +
         d.getFullYear() + ' ' +
         String(d.getHours()).padStart(2, '0') + ':' +
         String(d.getMinutes()).padStart(2, '0') + ':' +
         String(d.getSeconds()).padStart(2, '0');
}

check();
