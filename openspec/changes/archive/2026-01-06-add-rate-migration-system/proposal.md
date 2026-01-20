# Proposal: Add Rate Migration System for Existing Users

## Summary
Implement a billing rate migration system to handle the transition from 1,000 VNĐ/$ to 2,500 VNĐ/$ for **existing users only**. New users (registered after the announcement) are automatically on the new rate and don't need migration. **All migration events will be logged to MongoDB for audit and tracking.**

## Problem Statement
The system is transitioning from low-cost resources (1,000 VNĐ/$) to higher-cost resources (2,500 VNĐ/$). Currently existing users have credits purchased at the old rate, but there's no mechanism to:
1. Track which users have migrated to the new rate (existing users only)
2. Allow users to choose between refund or migration
3. Block API access for non-migrated existing users
4. Automatically consider new users as "migrated" since they're on the new rate
5. **Log migration events to MongoDB for audit trail and reporting**

## Background
- Current rate: 1,000 VNĐ = $1 USD (old users)
- New rate: 2,500 VNĐ = $1 USD (applies to all going forward)
- **Existing users**: Registered before the announcement date, need to choose migration or refund
- **New users**: Registered after the announcement, automatically on new rate (no migration needed)
- Users have 3 days from announcement to request refund
- After 3 days, all non-migrated existing users will be auto-migrated
- Refund applies only to credits > $10 (excluding promotional credits)
- Migration converts existing credits to new rate (credit value reduces proportionally)
- **Migration logging**: Track who migrated, when, and credit changes for audit purposes

## Goals
1. Track migration status per user (existing users only)
2. Provide dashboard UI for existing users to choose refund or migration
3. Block API access for non-migrated existing users
4. Automatically set new users as "migrated" (no migration needed)
5. Automatically migrate credits (divide by 2.5) when existing user chooses migration
6. **Log all migration events to MongoDB with user details and credit changes**

## Non-Goals
- Automatic bulk migration for all existing users (this proposal handles user-initiated migration)
- Refund processing (handled externally via Discord)
- Rate configuration changes (backend rate update is separate)

## Proposed Solution

### Database Changes

**1. UserNew Model Update:**
Add `migration` field to `UserNew` model:
```typescript
migration: {
  type: boolean
  default: false  // For existing users - requires migration
}
```

**Important**: New user registration logic will set `migration: true` automatically since they're registering at the new rate.

**2. New MigrationLog Model:**
Create a new `MigrationLog` model to track all migration events:
```typescript
{
  _id: string (ObjectId)
  userId: string (reference to UserNew._id)
  username: string
  oldCredits: number (credits before migration)
  newCredits: number (credits after migration / 2.5)
  migratedAt: Date (timestamp of migration)
  oldRate: number (1000 - for reference)
  newRate: number (2500 - for reference)
}
```

This collection will be stored as `migration_logs` in MongoDB.

### Backend Changes
1. **UserNew Model Update**: Add `migration: boolean` field (default: false for existing users)
2. **MigrationLog Model Creation**: Create new model and collection for tracking migration events
3. **Registration Update**: New user registration sets `migration: true` automatically
4. **Migration API Endpoint**: `POST /api/user/migrate` to process user's migration choice and log to MongoDB
5. **Migration Repository/Service**: Include logging logic to insert migration record into `migration_logs`
6. **API Middleware**: Check migration status before processing LLM requests (only for existing users with `migration: false`)

### Frontend Changes
1. **Dashboard Page**: Add migration banner/overlay for existing non-migrated users only
2. **Migration UI**: Two-button interface:
   - Option 1: "Request Refund" → Opens Discord in new tab
   - Option 2: "Migrate Credits" → Calls migration API
3. **Post-Migration State**: Show migration confirmation and updated credit balance

### Migration Logic
When user chooses migration:
1. Calculate new credits: `newCredits = currentCredits / 2.5`
2. Set `migration = true`
3. Update user's credit balance
4. **Insert migration log record into `migration_logs` collection with:**
   - userId, username, oldCredits, newCredits
   - migratedAt timestamp
   - oldRate (1000), newRate (2500)
5. Return success response with new balance

## Impact Analysis

### Breaking Changes
- Users who haven't migrated will be blocked from API access
- Credit balances will change (reduce by factor of 2.5) after migration

### User Experience
- Positive: Clear choice between refund and migration
- Positive: Dashboard UI guides users through process
- Negative: Credit balance decreases after migration
- Negative: Users blocked until they make a choice

### Performance
- Minimal: One additional boolean check per API request
- Migration calculation is simple division

## Alternatives Considered

### Alternative 1: Auto-migrate all users immediately
**Pros**: No user action required
**Cons**: No refund option, poor UX, potential customer dissatisfaction

### Alternative 2: No migration, change rate for new purchases only
**Pros**: No changes to existing users
**Cons**: Accounting complexity, grandfathering issues, unfair to new users

### Alternative 3: Separate credit pools for old and new rates
**Pros**: Preserves old rate value
**Cons**: Complex implementation, ongoing accounting overhead

## Dependencies
- UserNew model exists and is active
- Dashboard page exists at `/dashboard`
- Discord support channel exists for refund requests

## Rollout Plan
1. Deploy backend changes (model + API)
2. Deploy frontend migration UI
3. Enable API blocking for non-migrated users
4. Monitor migration completion rate
5. After 3 days, auto-migrate remaining users

## Success Metrics
- Percentage of users migrated within 3 days
- Number of refund requests
- API error rate for non-migrated users (should be zero after initial spike)
- User feedback on migration process
