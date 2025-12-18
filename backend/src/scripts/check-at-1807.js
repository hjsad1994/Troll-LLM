const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  // Payment details
  const payment = await db.collection('payments').findOne({ sepayTransactionId: '35978310' });

  // Payment completed at UTC 06:11:16 = 13:11:16 UTC+7
  const completedAtUTC = new Date(payment.completedAt);

  // Report time: 18:07 UTC+7 = 11:07 UTC
  const reportTimeUTC = new Date('2025-12-18T11:07:00.000Z');

  console.log('=== PAYMENT 35978310 ===');
  console.log('CompletedAt (UTC+7): 18/12/2025 13:11:16');
  console.log('Report time (UTC+7): 18/12/2025 18:07:00');
  console.log('Credits Before: $' + payment.creditsBefore.toFixed(4));
  console.log('Credits After: $' + payment.creditsAfter.toFixed(4));

  // Get usage from payment to report time
  const usageSincePayment = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: completedAtUTC, $lte: reportTimeUTC } } },
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

  console.log('\n=== SỬ DỤNG TỪ 13:11 ĐẾN 18:07 (UTC+7) ===');
  if (usageSincePayment.length > 0) {
    const u = usageSincePayment[0];
    console.log('Tổng số requests:', u.count);
    console.log('Tổng chi phí:', '$' + u.totalCost.toFixed(4));
    console.log('Tổng input tokens:', u.totalInput?.toLocaleString() || 0);
    console.log('Tổng output tokens:', u.totalOutput?.toLocaleString() || 0);
  } else {
    console.log('Không có requests trong khoảng thời gian này');
  }

  // Hourly breakdown in UTC+7
  console.log('\n=== CHI TIẾT THEO GIỜ (UTC+7) ===');
  const hourly = await db.collection('request_logs').aggregate([
    { $match: { userId: 'longcachep', createdAt: { $gte: completedAtUTC, $lte: reportTimeUTC } } },
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

  // Analysis
  console.log('\n=== ĐỐI CHIẾU TẠI THỜI ĐIỂM 18:07 ===');
  const creditsAfterPayment = payment.creditsAfter;
  const loggedSpent = usageSincePayment[0]?.totalCost || 0;
  const expectedCredits = creditsAfterPayment - loggedSpent;

  console.log('Credits sau nạp: $' + creditsAfterPayment.toFixed(4));
  console.log('Đã dùng (từ logs): $' + loggedSpent.toFixed(4));
  console.log('Kỳ vọng còn lại: $' + expectedCredits.toFixed(4));

  // User said they have $76 at 18:07
  console.log('\n=== SO SÁNH VỚI USER BÁO CÁO ===');
  console.log('User báo còn: ~$76');
  console.log('Kỳ vọng theo logs: $' + expectedCredits.toFixed(2));
  console.log('Chênh lệch: $' + (76 - expectedCredits).toFixed(2));

  await mongoose.disconnect();
}

check();
