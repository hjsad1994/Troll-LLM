#!/usr/bin/env ts-node
/**
 * Token Usage Statistics Script
 *
 * Analyzes token usage from request logs including:
 * - Input tokens
 * - Output tokens
 * - Cache Write tokens (cacheW)
 * - Cache Hit tokens (cacheH)
 *
 * Usage:
 *   ts-node scripts/token-stats.ts [options]
 *
 * Options:
 *   --period <hours>     Period in hours (default: 24)
 *   --model <name>       Filter by model name
 *   --user <userId>      Filter by user ID
 *   --credit-type <type> Filter by credit type (ohmygpt/openhands)
 *   --detailed           Show detailed breakdown
 *   --export <file>      Export results to JSON file
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RequestLog } from '../backend/src/models/request-log.model';

// Load environment variables
dotenv.config();

interface TokenStats {
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheHitTokens: number;
  totalTokens: number;
  totalCost: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
}

interface ModelStats extends TokenStats {
  model: string;
}

interface UserStats extends TokenStats {
  userId: string;
}

interface DetailedStats {
  overall: TokenStats;
  byModel: ModelStats[];
  byUser: UserStats[];
  byCreditType: {
    ohmygpt: TokenStats;
    openhands: TokenStats;
  };
  cacheEfficiency: {
    cacheHitRate: number;
    cacheTotalTokens: number;
    cacheWriteTokens: number;
    cacheHitTokens: number;
  };
}

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fproxy';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB');
}

async function getTokenStats(
  periodHours: number,
  filters: {
    model?: string;
    userId?: string;
    creditType?: string;
  } = {}
): Promise<DetailedStats> {
  const startTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);

  // Build query
  const query: any = {
    createdAt: { $gte: startTime },
  };

  if (filters.model) query.model = filters.model;
  if (filters.userId) query.userId = filters.userId;
  if (filters.creditType) query.creditType = filters.creditType;

  // Overall stats
  const overallStats = await RequestLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
        cacheWriteTokens: { $sum: '$cacheWriteTokens' },
        cacheHitTokens: { $sum: '$cacheHitTokens' },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$creditsCost' },
        successfulRequests: {
          $sum: { $cond: ['$isSuccess', 1, 0] },
        },
        failedRequests: {
          $sum: { $cond: ['$isSuccess', 0, 1] },
        },
        totalLatency: { $sum: '$latencyMs' },
      },
    },
  ]);

  const overall: TokenStats = overallStats[0] || {
    totalRequests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheHitTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
  };

  overall.averageLatency = overall.totalRequests > 0
    ? overall.totalLatency / overall.totalRequests
    : 0;

  // Stats by model
  const modelStats = await RequestLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$model',
        totalRequests: { $sum: 1 },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
        cacheWriteTokens: { $sum: '$cacheWriteTokens' },
        cacheHitTokens: { $sum: '$cacheHitTokens' },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$creditsCost' },
        successfulRequests: {
          $sum: { $cond: ['$isSuccess', 1, 0] },
        },
        failedRequests: {
          $sum: { $cond: ['$isSuccess', 0, 1] },
        },
        totalLatency: { $sum: '$latencyMs' },
      },
    },
    { $sort: { totalTokens: -1 } },
  ]);

  const byModel: ModelStats[] = modelStats.map((stat) => ({
    model: stat._id || 'unknown',
    totalRequests: stat.totalRequests,
    inputTokens: stat.inputTokens,
    outputTokens: stat.outputTokens,
    cacheWriteTokens: stat.cacheWriteTokens,
    cacheHitTokens: stat.cacheHitTokens,
    totalTokens: stat.totalTokens,
    totalCost: stat.totalCost,
    successfulRequests: stat.successfulRequests,
    failedRequests: stat.failedRequests,
    averageLatency: stat.totalRequests > 0 ? stat.totalLatency / stat.totalRequests : 0,
  }));

  // Stats by user
  const userStats = await RequestLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$userId',
        totalRequests: { $sum: 1 },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
        cacheWriteTokens: { $sum: '$cacheWriteTokens' },
        cacheHitTokens: { $sum: '$cacheHitTokens' },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$creditsCost' },
        successfulRequests: {
          $sum: { $cond: ['$isSuccess', 1, 0] },
        },
        failedRequests: {
          $sum: { $cond: ['$isSuccess', 0, 1] },
        },
        totalLatency: { $sum: '$latencyMs' },
      },
    },
    { $sort: { totalTokens: -1 } },
  ]);

  const byUser: UserStats[] = userStats.map((stat) => ({
    userId: stat._id || 'unknown',
    totalRequests: stat.totalRequests,
    inputTokens: stat.inputTokens,
    outputTokens: stat.outputTokens,
    cacheWriteTokens: stat.cacheWriteTokens,
    cacheHitTokens: stat.cacheHitTokens,
    totalTokens: stat.totalTokens,
    totalCost: stat.totalCost,
    successfulRequests: stat.successfulRequests,
    failedRequests: stat.failedRequests,
    averageLatency: stat.totalRequests > 0 ? stat.totalLatency / stat.totalRequests : 0,
  }));

  // Stats by credit type
  const creditTypeStats = await RequestLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$creditType',
        totalRequests: { $sum: 1 },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
        cacheWriteTokens: { $sum: '$cacheWriteTokens' },
        cacheHitTokens: { $sum: '$cacheHitTokens' },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$creditsCost' },
        successfulRequests: {
          $sum: { $cond: ['$isSuccess', 1, 0] },
        },
        failedRequests: {
          $sum: { $cond: ['$isSuccess', 0, 1] },
        },
        totalLatency: { $sum: '$latencyMs' },
      },
    },
  ]);

  const byCreditType = {
    ohmygpt: {
      totalRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheHitTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
    },
    openhands: {
      totalRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheHitTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
    },
  };

  creditTypeStats.forEach((stat) => {
    const type = stat._id || 'ohmygpt';
    if (type === 'ohmygpt' || type === 'openhands') {
      byCreditType[type] = {
        totalRequests: stat.totalRequests,
        inputTokens: stat.inputTokens,
        outputTokens: stat.outputTokens,
        cacheWriteTokens: stat.cacheWriteTokens,
        cacheHitTokens: stat.cacheHitTokens,
        totalTokens: stat.totalTokens,
        totalCost: stat.totalCost,
        successfulRequests: stat.successfulRequests,
        failedRequests: stat.failedRequests,
        averageLatency: stat.totalRequests > 0 ? stat.totalLatency / stat.totalRequests : 0,
      };
    }
  });

  // Cache efficiency
  const cacheTotalTokens = overall.cacheWriteTokens + overall.cacheHitTokens;
  const cacheHitRate = cacheTotalTokens > 0
    ? (overall.cacheHitTokens / cacheTotalTokens) * 100
    : 0;

  return {
    overall,
    byModel,
    byUser,
    byCreditType,
    cacheEfficiency: {
      cacheHitRate,
      cacheTotalTokens,
      cacheWriteTokens: overall.cacheWriteTokens,
      cacheHitTokens: overall.cacheHitTokens,
    },
  };
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatCurrency(num: number): string {
  return `$${num.toFixed(4)}`;
}

function formatLatency(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function displayStats(stats: DetailedStats, detailed: boolean) {
  console.log('\n' + '='.repeat(80));
  console.log('TOKEN USAGE STATISTICS');
  console.log('='.repeat(80));

  // Overall stats
  console.log('\n📊 OVERALL STATISTICS:');
  console.log('-'.repeat(80));
  console.log(`Total Requests:      ${formatNumber(stats.overall.totalRequests)}`);
  console.log(`Successful:          ${formatNumber(stats.overall.successfulRequests)} (${((stats.overall.successfulRequests / stats.overall.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed:              ${formatNumber(stats.overall.failedRequests)} (${((stats.overall.failedRequests / stats.overall.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Average Latency:     ${formatLatency(stats.overall.averageLatency)}`);
  console.log();
  console.log(`Input Tokens:        ${formatNumber(stats.overall.inputTokens)}`);
  console.log(`Output Tokens:       ${formatNumber(stats.overall.outputTokens)}`);
  console.log(`Cache Write (cacheW): ${formatNumber(stats.overall.cacheWriteTokens)}`);
  console.log(`Cache Hit (cacheH):   ${formatNumber(stats.overall.cacheHitTokens)}`);
  console.log(`Total Tokens:        ${formatNumber(stats.overall.totalTokens)}`);
  console.log();
  console.log(`Total Cost:          ${formatCurrency(stats.overall.totalCost)}`);

  // Cache efficiency
  console.log('\n💾 CACHE EFFICIENCY:');
  console.log('-'.repeat(80));
  console.log(`Cache Hit Rate:      ${stats.cacheEfficiency.cacheHitRate.toFixed(2)}%`);
  console.log(`Cache Write Tokens:  ${formatNumber(stats.cacheEfficiency.cacheWriteTokens)}`);
  console.log(`Cache Hit Tokens:    ${formatNumber(stats.cacheEfficiency.cacheHitTokens)}`);
  console.log(`Cache Total Tokens:  ${formatNumber(stats.cacheEfficiency.cacheTotalTokens)}`);

  // Credit type breakdown
  console.log('\n💳 BY CREDIT TYPE:');
  console.log('-'.repeat(80));
  console.log('OhMyGPT:');
  console.log(`  Requests:          ${formatNumber(stats.byCreditType.ohmygpt.totalRequests)}`);
  console.log(`  Input Tokens:      ${formatNumber(stats.byCreditType.ohmygpt.inputTokens)}`);
  console.log(`  Output Tokens:     ${formatNumber(stats.byCreditType.ohmygpt.outputTokens)}`);
  console.log(`  Cache Write:       ${formatNumber(stats.byCreditType.ohmygpt.cacheWriteTokens)}`);
  console.log(`  Cache Hit:         ${formatNumber(stats.byCreditType.ohmygpt.cacheHitTokens)}`);
  console.log(`  Total Tokens:      ${formatNumber(stats.byCreditType.ohmygpt.totalTokens)}`);
  console.log(`  Cost:              ${formatCurrency(stats.byCreditType.ohmygpt.totalCost)}`);
  console.log();
  console.log('OpenHands:');
  console.log(`  Requests:          ${formatNumber(stats.byCreditType.openhands.totalRequests)}`);
  console.log(`  Input Tokens:      ${formatNumber(stats.byCreditType.openhands.inputTokens)}`);
  console.log(`  Output Tokens:     ${formatNumber(stats.byCreditType.openhands.outputTokens)}`);
  console.log(`  Cache Write:       ${formatNumber(stats.byCreditType.openhands.cacheWriteTokens)}`);
  console.log(`  Cache Hit:         ${formatNumber(stats.byCreditType.openhands.cacheHitTokens)}`);
  console.log(`  Total Tokens:      ${formatNumber(stats.byCreditType.openhands.totalTokens)}`);
  console.log(`  Cost:              ${formatCurrency(stats.byCreditType.openhands.totalCost)}`);

  if (detailed) {
    // By model
    if (stats.byModel.length > 0) {
      console.log('\n🤖 BY MODEL:');
      console.log('-'.repeat(80));
      stats.byModel.forEach((model) => {
        console.log(`\n${model.model}:`);
        console.log(`  Requests:          ${formatNumber(model.totalRequests)}`);
        console.log(`  Input Tokens:      ${formatNumber(model.inputTokens)}`);
        console.log(`  Output Tokens:     ${formatNumber(model.outputTokens)}`);
        console.log(`  Cache Write:       ${formatNumber(model.cacheWriteTokens)}`);
        console.log(`  Cache Hit:         ${formatNumber(model.cacheHitTokens)}`);
        console.log(`  Total Tokens:      ${formatNumber(model.totalTokens)}`);
        console.log(`  Cost:              ${formatCurrency(model.totalCost)}`);
        console.log(`  Avg Latency:       ${formatLatency(model.averageLatency)}`);
      });
    }

    // By user
    if (stats.byUser.length > 0) {
      console.log('\n👤 BY USER (Top 10):');
      console.log('-'.repeat(80));
      stats.byUser.slice(0, 10).forEach((user) => {
        console.log(`\n${user.userId}:`);
        console.log(`  Requests:          ${formatNumber(user.totalRequests)}`);
        console.log(`  Input Tokens:      ${formatNumber(user.inputTokens)}`);
        console.log(`  Output Tokens:     ${formatNumber(user.outputTokens)}`);
        console.log(`  Cache Write:       ${formatNumber(user.cacheWriteTokens)}`);
        console.log(`  Cache Hit:         ${formatNumber(user.cacheHitTokens)}`);
        console.log(`  Total Tokens:      ${formatNumber(user.totalTokens)}`);
        console.log(`  Cost:              ${formatCurrency(user.totalCost)}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function main() {
  const args = process.argv.slice(2);

  let periodHours = 24;
  let model: string | undefined;
  let userId: string | undefined;
  let creditType: string | undefined;
  let detailed = false;
  let exportFile: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--period':
        periodHours = parseInt(args[++i], 10);
        break;
      case '--model':
        model = args[++i];
        break;
      case '--user':
        userId = args[++i];
        break;
      case '--credit-type':
        creditType = args[++i];
        break;
      case '--detailed':
        detailed = true;
        break;
      case '--export':
        exportFile = args[++i];
        break;
      case '--help':
        console.log(`
Token Usage Statistics Script

Usage:
  ts-node scripts/token-stats.ts [options]

Options:
  --period <hours>     Period in hours (default: 24)
  --model <name>       Filter by model name
  --user <userId>      Filter by user ID
  --credit-type <type> Filter by credit type (ohmygpt/openhands)
  --detailed           Show detailed breakdown by model and user
  --export <file>      Export results to JSON file
  --help               Show this help message

Examples:
  # Last 24 hours
  ts-node scripts/token-stats.ts

  # Last 7 days with detailed breakdown
  ts-node scripts/token-stats.ts --period 168 --detailed

  # Specific model
  ts-node scripts/token-stats.ts --model "claude-3-5-sonnet-20241022"

  # OpenHands credits only
  ts-node scripts/token-stats.ts --credit-type openhands

  # Export to JSON
  ts-node scripts/token-stats.ts --detailed --export stats.json
        `);
        process.exit(0);
    }
  }

  try {
    await connectDB();

    console.log(`\nAnalyzing token usage for the last ${periodHours} hours...`);
    if (model) console.log(`Filtering by model: ${model}`);
    if (userId) console.log(`Filtering by user: ${userId}`);
    if (creditType) console.log(`Filtering by credit type: ${creditType}`);

    const stats = await getTokenStats(periodHours, { model, userId, creditType });

    displayStats(stats, detailed);

    if (exportFile) {
      const fs = require('fs');
      fs.writeFileSync(exportFile, JSON.stringify(stats, null, 2));
      console.log(`✓ Results exported to ${exportFile}\n`);
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
