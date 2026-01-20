# Proposal: Fix New User Migration Default Value

## Summary

Fix a critical bug where newly registered users are incorrectly assigned `migration: false` in the database schema default, causing them to be blocked from accessing the API until they manually migrate. New users should automatically be on the new billing rate (2,500 VNĐ/$) and should never see the migration UI or be blocked.

## Problem

Currently, the `UserNew` model schema defines `migration` field with `default: false`:

```typescript
// backend/src/models/user-new.model.ts:67
migration: { type: Boolean, default: false }
```

While the repository's `create()` method explicitly sets `migration: true`, the schema default creates a vulnerability:

1. **Schema-level inconsistency**: The default value in the schema doesn't match the intended behavior
2. **Potential race conditions**: If user creation fails to explicitly set the field, it defaults to `false`
3. **Data integrity risk**: Database operations that bypass the repository (e.g., bulk inserts, migrations) may create users with `migration: false`
4. **Existing users already migrated**: Users created after the rate change announcement (2026-01-06) are already being set to `migration: true` in the repository, but the schema default contradicts this

## Current Behavior

- New user registration → Repository sets `migration: true` explicitly
- Schema default is `false` (contradiction)
- If any code path fails to set the field explicitly, user gets `migration: false`
- User is blocked by migration-check middleware
- User sees migration UI (confusing for new users)

## Proposed Solution

Change the schema default from `false` to `true` to match the intended behavior:

```typescript
// backend/src/models/user-new.model.ts:67
migration: { type: Boolean, default: true }
```

This ensures:
1. **Default is safe**: New users default to migrated state (no migration needed)
2. **Explicit override for existing users**: Only users who existed before the rate change should have `migration: false`
3. **Schema reflects reality**: The default matches the business logic (all new users are on new rate)
4. **Future-proof**: Any new user creation path will default to the correct state

## Impact

### Affected Components

1. **Backend**: UserNew model schema (`backend/src/models/user-new.model.ts`)
2. **Database**: MongoDB schema default value
3. **Migration**: Need to update any existing new users who may have been incorrectly set to `false`

### User Impact

- **Positive**: New users will never see migration UI or be blocked
- **No negative impact**: Existing users with `migration: false` (who actually need migration) remain unchanged
- **No breaking changes**: API behavior remains the same, only default value changes

### Migration Strategy

1. Update schema default to `true`
2. Run one-time database migration to fix any new users (created after 2026-01-06) who incorrectly have `migration: false`
3. Ensure repository continues to explicitly set `migration: true` for clarity

## Alternatives Considered

### Alternative 1: Keep schema default, rely on repository
- **Rejected**: Creates vulnerability if repository is bypassed
- **Rejected**: Schema doesn't document the true default behavior

### Alternative 2: Remove migration field entirely
- **Rejected**: Still needed to track which users have migrated from old rate
- **Rejected**: Audit trail requires distinguishing migrated vs non-migrated users

### Alternative 3: Use timestamp-based migration check
- **Rejected**: Adds complexity
- **Rejected**: Cannot distinguish users who manually migrated vs auto-migrated
- **Rejected**: Current boolean field is simpler and sufficient

## Dependencies

- Requires database migration script to fix existing incorrect data
- Requires testing to ensure middleware correctly handles `true` default

## Success Criteria

1. New users created after the fix have `migration: true` in database
2. New users can access API immediately without migration
3. New users never see migration UI
4. Existing users with `migration: false` are not affected
5. One-time migration script successfully fixes any incorrect data

## Timeline

This is a critical bug fix that should be implemented immediately to prevent new user friction.
