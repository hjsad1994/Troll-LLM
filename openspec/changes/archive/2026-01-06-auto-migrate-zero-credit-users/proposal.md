# Proposal: Auto-Migrate Users with Zero Credits

## Summary

Automatically set `migration: true` for existing users who have `credits = 0`. These users have no remaining credits to migrate, so their next top-up will naturally be at the new billing rate (2,500 VNĐ/$). This reduces friction for users with zero balances while maintaining the migration requirement for users who still have credits under the old rate.

## Problem

Currently, the migration system treats all existing users (with `migration: false`) the same way - they are blocked from accessing the API until they complete migration. However, this creates unnecessary friction for users who have already spent all their credits:

1. **No credits to migrate**: Users with `credits = 0` have nothing to lose from the rate change
2. **Future top-ups at new rate**: When these users add credits, they'll automatically be at the new 2,500 VNĐ/$ rate
3. **Unnecessary blocking**: These users are forced to click through migration UI even though it has no effect on them
4. **Poor UX**: Confusing for users to see "migrate your credits" when they have zero credits

**Example scenario:**
- User registered before rate change, bought $10 credits
- User spent all $10 on API calls
- User now has `credits: 0`, `migration: false`
- User is blocked from API until they "migrate" - but migration of 0 credits does nothing
- User's next top-up will be at new rate anyway

## Current Behavior

For ALL existing users (`migration: false`):
- Blocked from API access by migration-check middleware
- See migration UI on dashboard
- Must click "Migrate Credits" button (even if they have 0 credits)
- Migration process runs but has no meaningful effect when credits = 0

## Proposed Solution

Add **auto-migration logic** for existing users with zero credits:

**Trigger points for auto-migration:**
1. **On API request**: When a user with `migration: false` and `credits = 0` attempts API access
2. **On dashboard load**: When user with `migration: false` and `credits = 0` visits dashboard
3. **One-time migration script**: To clean up existing zero-credit users

**Logic:**
```typescript
if (user.migration === false && user.credits === 0) {
  // Auto-migrate user - no credits to migrate
  await setMigrated(userId);
  // User can now access API normally
}
```

**Benefits:**
1. **Reduces friction**: Users with zero credits don't need manual migration
2. **No negative impact**: Migration of 0 credits has no economic effect
3. **Better UX**: These users skip the confusing migration UI
4. **Maintains integrity**: Users with credits > 0 still need explicit migration

## Impact

### Affected Components

1. **Backend**: Migration service and middleware
   - `backend/src/services/migration.service.ts` - Add auto-migrate method
   - `backend/src/middleware/migration-check.ts` - Auto-migrate on API access

2. **Backend**: User routes
   - `backend/src/routes/user.routes.ts` - Auto-migrate on profile fetch

3. **Database**: Migration script
   - One-time script to set `migration: true` for all users with `credits = 0` and `migration = false`

### User Impact

- **Positive**: Users with zero credits can immediately access API without migration UI
- **No negative impact**: Users with credits > 0 still see migration and must explicitly choose
- **No breaking changes**: Migration logic remains the same for users with actual credits

## Migration Strategy

1. Add `autoMigrateIfZeroCredits()` method to MigrationService
2. Update middleware to call auto-migrate before blocking
3. Update dashboard profile fetch to auto-migrate
4. Run one-time database migration script to clean up existing users
5. Log auto-migration events to migration_logs collection (with oldCredits=0, newCredits=0)

## Alternatives Considered

### Alternative 1: Keep current behavior (require manual migration)
- **Rejected**: Creates unnecessary friction for users with no credits
- **Rejected**: Poor UX - users see migration UI when it has no effect

### Alternative 2: Auto-migrate ALL existing users
- **Rejected**: Would bypass migration for users with credits > 0
- **Rejected**: Defeats the purpose of migration system (users lose 60% of credits)

### Alternative 3: Ask user to confirm auto-migration
- **Rejected**: Still adds unnecessary step for users with zero credits
- **Rejected**: Confusing UI - "confirm migration of 0 credits"

## Dependencies

- Existing migration system (`rate-migration` spec)
- MigrationLog model for audit trail
- Database migration script to clean up existing users

## Success Criteria

1. Users with `migration: false` and `credits = 0` are auto-migrated on next interaction
2. Auto-migrated users can access API immediately without manual migration
3. Auto-migration is logged to migration_logs with credits=0
4. Users with `credits > 0` still require explicit migration
5. One-time migration script successfully updates all zero-credit users
6. Migration UI only shows for users who actually have credits to migrate

## Edge Cases

1. **User with 0 credits but refCredits > 0**: Still auto-migrate (refCredits are separate from purchased credits)
2. **User with 0 credits after migration**: Already handled (they're already migrated)
3. **Race condition**: Auto-migrate is idempotent - if already migrated, no-op
4. **Admin users**: Already bypass migration check, no change needed

## Timeline

This is a UX improvement that should be implemented soon to reduce friction for existing users with zero credit balances.
