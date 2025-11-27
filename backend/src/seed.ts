import 'dotenv/config';
import mongoose from 'mongoose';
import { FactoryKey, Proxy, ProxyKeyBinding } from './db/mongodb.js';

const MONGODB_URI = process.env.MONGODB_URI || '';

const factoryKeys = [
  { id: 'factory-1', apiKey: 'fk-N6FUCAIjXlNbQEOMQI7g-H8tdTvL-iNl-UC2YdiNoA1Mps5RKmxt9CDBVabT2zog' },
  { id: 'factory-2', apiKey: 'fk-A3yfgtSJQLkRy3yyf9WQ-RjJgLJKP9Zf_oM1qt7w160wQ1aUSAaechFHaHqKGR-8' },
  { id: 'factory-3', apiKey: 'fk-znCvmoJYR7x6jhQqmBUv-LuJ9H6bt698J9BANe2hSCOxMVojqnT4rEkmyT45zpdE' },
  { id: 'factory-4', apiKey: 'fk-RBOAzy9j7gldnHJPG3CN-ylOGyM1-gSRjBk-ZnYRvV_9TXyxBfe0s153BWTNUaKk' },
];

const proxies = [
  { id: 'proxy-1', name: 'Proxy VN 1', type: 'http', host: '160.250.166.89', port: 25265, username: 'hjsad1995', password: 'aa0908700714' },
  { id: 'proxy-2', name: 'Proxy VN 2', type: 'http', host: '113.160.166.31', port: 11161, username: 'hjsad1994', password: 'aa0908700714' },
];

// Bind 2 keys per proxy
const bindings = [
  { proxyId: 'proxy-1', factoryKeyId: 'factory-1', priority: 1 },
  { proxyId: 'proxy-1', factoryKeyId: 'factory-2', priority: 2 },
  { proxyId: 'proxy-2', factoryKeyId: 'factory-3', priority: 1 },
  { proxyId: 'proxy-2', factoryKeyId: 'factory-4', priority: 2 },
];

async function seed() {
  console.log('🌱 Starting seed...');
  
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'fproxy' });
  console.log('✅ Connected to MongoDB');

  // Seed Factory Keys
  console.log('\n📦 Seeding Factory Keys...');
  for (const key of factoryKeys) {
    const existing = await FactoryKey.findById(key.id);
    if (existing) {
      console.log(`  ⏭️  ${key.id} already exists`);
    } else {
      await FactoryKey.create({
        _id: key.id,
        apiKey: key.apiKey,
        status: 'healthy',
      });
      console.log(`  ✅ Created ${key.id}`);
    }
  }

  // Seed Proxies
  console.log('\n🌐 Seeding Proxies...');
  for (const proxy of proxies) {
    const existing = await Proxy.findById(proxy.id);
    if (existing) {
      console.log(`  ⏭️  ${proxy.id} (${proxy.name}) already exists`);
    } else {
      await Proxy.create({
        _id: proxy.id,
        name: proxy.name,
        type: proxy.type,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password,
        status: 'unknown',
        isActive: true,
      });
      console.log(`  ✅ Created ${proxy.id} (${proxy.name}) - ${proxy.host}:${proxy.port}`);
    }
  }

  // Seed Bindings
  console.log('\n🔗 Seeding Proxy-Key Bindings...');
  for (const binding of bindings) {
    const existing = await ProxyKeyBinding.findOne({ 
      proxyId: binding.proxyId, 
      factoryKeyId: binding.factoryKeyId 
    });
    if (existing) {
      console.log(`  ⏭️  ${binding.proxyId} <-> ${binding.factoryKeyId} already exists`);
    } else {
      await ProxyKeyBinding.create({
        proxyId: binding.proxyId,
        factoryKeyId: binding.factoryKeyId,
        priority: binding.priority,
        isActive: true,
      });
      console.log(`  ✅ Bound ${binding.factoryKeyId} to ${binding.proxyId} (priority: ${binding.priority})`);
    }
  }

  console.log('\n✅ Seed completed!');
  console.log('\nSummary:');
  console.log(`  Factory Keys: ${await FactoryKey.countDocuments()}`);
  console.log(`  Proxies: ${await Proxy.countDocuments()}`);
  console.log(`  Bindings: ${await ProxyKeyBinding.countDocuments()}`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
