import 'dotenv/config';
import mongoose from 'mongoose';
import { User, generateApiKey } from '../models/user.model.js';

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fproxy';
  const dbName = process.env.MONGODB_DB_NAME || 'fproxy';
  
  console.log('Connecting to MongoDB...', dbName);
  await mongoose.connect(mongoUri, { dbName });
  console.log('Connected to database:', dbName);

  // Find all users
  const users = await User.find({});
  console.log(`Found ${users.length} users.`);

  let updated = 0;
  for (const user of users) {
    const updates: any = {};
    
    // Set plan to free if not set
    if (!user.plan) {
      updates.plan = 'free';
    }
    
    // Set totalTokens to 0 for free users
    if (!user.plan || user.plan === 'free') {
      updates.totalTokens = 0;
    }
    
    // Generate API key if not exists
    if (!user.apiKey) {
      updates.apiKey = generateApiKey();
      updates.apiKeyCreatedAt = new Date();
    }
    
    // Set defaults for missing fields
    if (user.tokensUsed === undefined) updates.tokensUsed = 0;
    if (user.monthlyTokensUsed === undefined) updates.monthlyTokensUsed = 0;
    if (!user.monthlyResetDate) {
      const now = new Date();
      updates.monthlyResetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }

    if (Object.keys(updates).length > 0) {
      await User.updateOne({ _id: user._id }, { $set: updates });
      console.log(`Updated user: ${user._id}`, updates);
      updated++;
    }
  }

  console.log(`Updated ${updated} users.`);
  
  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch(console.error);
