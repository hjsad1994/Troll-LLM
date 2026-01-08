# Design: Migration Script Architecture

## Overview

Script này là một standalone TypeScript script được chạy qua Node.js để migrate user credits từ rate 1000 sang 2500. Script sử dụng existing models và database schema.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Migration Script                          │
│  migrate-credits-1000-to-2500.ts                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB                                 │
│  ┌──────────────┐         ┌──────────────────┐              │
│  │  usersNew    │────────▶│ migration_logs   │              │
│  │  collection  │         │  collection      │              │
│  └──────────────┘         └──────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Script Flow

```
START
  │
  ▼
Parse CLI args (--apply flag)
  │
  ▼
Connect to MongoDB
  │
  ▼
DRY RUN?
  │ Yes                 No
  ▼                     ▼
┌─────────────────┐  ┌─────────────────────┐
│ Find users      │  │ Find users          │
│ migration:false │  │ migration:false     │
│                 │  │                     │
│ Display summary │  │ For each user:      │
│ Display details │  │  1. Calculate new   │
│ (NO CHANGES)    │  │     credits         │
│                 │  │  2. Update user     │
└─────────────────┘  │  3. Create log      │
                     │  4. Handle errors   │
                     │                     │
                     │ Display results     │
                     └─────────────────────┘
  │
  ▼
Disconnect
  │
  ▼
END
```

## Data Flow

### Input
- CLI args: `--apply` (optional, default = dry-run)
- Environment: `MONGODB_URI`, `MONGODB_DB_NAME`

### Processing
1. **Query users**: `usersNew.find({ migration: false })`
2. **Calculate**: `newCredits = credits / 2.5`
3. **Update**: `usersNew.updateOne({ _id }, { $set: { migration: true, credits: newCredits } })`
4. **Log**: `migration_logs.insertOne({ userId, username, oldCredits, newCredits, ... })`

### Output
- Console: Progress, summary, detailed table, results
- Database: Updated users, inserted migration logs

## Error Handling Strategy

### Per-User Error Handling
```typescript
for (const user of users) {
  try {
    await migrateUser(user);
    successCount++;
  } catch (error) {
    errorCount++;
    console.error(`Failed: ${user._id}`, error.message);
    // Continue with next user
  }
}
```

### Rollback Considerations
- **No automatic rollback** - script is designed to be idempotent
- If script fails mid-way, can be re-run:
  - Already migrated users have `migration: true`, will be skipped
  - Failed users still have `migration: false`, will be retried

## Database Schema Usage

### UserNew Collection (existing)
```typescript
{
  _id: string,
  credits: number,
  migration: boolean,  // false → true
  // ... other fields unchanged
}
```

### MigrationLog Collection (existing)
```typescript
{
  userId: string,
  username: string,
  oldCredits: number,
  newCredits: number,
  migratedAt: Date,
  oldRate: 1000,
  newRate: 2500,
  autoMigrated: false,  // Manual migration via script
}
```

## Implementation Details

### Credit Calculation
```typescript
function calculateNewCredits(oldCredits: number): number {
  const RATE_RATIO = 2500 / 1000; // 2.5
  const newCredits = oldCredits / RATE_RATIO;
  return Math.round(newCredits * 10000) / 10000; // 4 decimal places
}
```

### Dry Run Logic
```typescript
const dryRun = !process.argv.includes('--apply');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made');
  // Display only, no DB writes
} else {
  console.log('✏️  APPLY MODE - Changes will be made to database');
  // Perform actual DB writes
}
```

### Progress Reporting
```typescript
const total = users.length;
for (let i = 0; i < users.length; i++) {
  // ... process user
  if ((i + 1) % 10 === 0 || i === users.length - 1) {
    console.log(`Progress: ${i + 1}/${total} users processed`);
  }
}
```

## Console Output Format

### Dry Run Mode
```
=== MIGRATION SCRIPT (DRY RUN) ===
Rate: 1000 → 2500 VND/USD (÷2.5)

📊 Found 150 users with migration: false

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Username                Old Credits    New Credits
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
user1@example.com       $50.00         $20.00
user2@example.com       $100.00        $40.00
user3@example.com       $0.00          $0.00
...

📋 SUMMARY:
  Total users found: 150
  Users to migrate: 150
  Total old credits: $7,500.00
  Total new credits: $3,000.00

🔍 DRY RUN COMPLETE - No changes made
To apply: npm run migrate-credits -- --apply
```

### Apply Mode
```
=== MIGRATION SCRIPT (APPLY) ===
Rate: 1000 → 2500 VND/USD (÷2.5)

📊 Found 150 users with migration: false

Processing...
  ✓ Migrated: user1@example.com ($50.00 → $20.00)
  ✓ Migrated: user2@example.com ($100.00 → $40.00)
  ✗ Failed: user3@example.com - Error: ...
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RESULTS:
  Successfully migrated: 148
  Failed: 2
  Skipped (already migrated): 0

📊 MIGRATION SUMMARY:
  Total old credits: $7,500.00
  Total new credits: $3,000.00
  Credits reduced: $4,500.00 (60%)

✅ MIGRATION COMPLETE
```

## Testing Strategy

### Unit Testing (Optional)
- Test credit calculation function
- Test rounding logic
- Test edge cases (zero credits, very large numbers)

### Integration Testing
1. **Test environment**: Use test database first
2. **Dry run test**: Run with dry-run, verify output
3. **Small batch test**: Run with --limit 10, verify DB changes
4. **Full run**: Run on production (off-hours)

### Verification Queries
```javascript
// Verify migration status
db.usersNew.countDocuments({ migration: false })
db.usersNew.countDocuments({ migration: true })

// Verify migration logs
db.migration_logs.countDocuments({ newRate: 2500 })

// Spot check specific user
db.usersNew.findOne({ _id: "user@example.com" })
db.migration_logs.findOne({ userId: "user@example.com" })
```

## Dependencies

### npm packages
- `mongoose` (MongoDB ODM) - existing
- `dotenv` (Environment variables) - existing
- No new dependencies needed

### File location
- `backend/src/scripts/migrate-credits-1000-to-2500.ts`

## Safety Considerations

1. **Backup before running**: Export usersNew collection before migration
2. **Off-hours execution**: Run when system traffic is low
3. **Monitoring**: Watch for errors during execution
4. **Verification**: Check results after completion
5. **Rollback plan**: Have manual rollback script ready (reverse migration)
