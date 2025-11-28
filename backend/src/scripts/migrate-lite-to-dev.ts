import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fproxy';
  const dbName = process.env.MONGODB_DB_NAME || 'fproxy';
  
  console.log('Connecting to MongoDB...', dbName);
  await mongoose.connect(mongoUri, { dbName });
  console.log('Connected to database:', dbName);

  // Find users with plan 'lite'
  const liteUsers = await User.find({ plan: 'lite' });
  console.log(`Found ${liteUsers.length} users with 'lite' plan.`);

  if (liteUsers.length === 0) {
    console.log('No users to migrate.');
    await mongoose.disconnect();
    console.log('Done.');
    return;
  }

  // Update lite users to dev plan with new limits
  const result = await User.updateMany(
    { plan: 'lite' },
    { 
      $set: { 
        plan: 'dev',
        totalTokens: 15_000_000  // Dev plan tokens
      } 
    }
  );

  console.log(`Migrated ${result.modifiedCount} users from 'lite' to 'dev' plan.`);
  
  // List migrated users
  for (const user of liteUsers) {
    console.log(`  - ${user._id}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch(console.error);
