# Proposal: migrate-credits-2500-to-1500

## Overview

Create a one-time migration script to convert existing user credits from the old rate (2500 VND/$1) to the new rate (1500 VND/$1), preserving the VND value of credits while adjusting the USD amount.

## Why

The system has transitioned to a new exchange rate (1500 VND/$1) to make credits more affordable for Vietnamese users. However, existing users who purchased credits at the old rate (2500 VND/$1) need their balances adjusted to maintain fair value. Without this migration, users would lose purchasing power - their existing credits would be worth less VND than they paid. This script ensures all users receive the correct credit amount reflecting the VND value they originally purchased.

## What Changes

### New Files
- `backend/scripts/migrate-credits-2500-to-1500.ts` - Migration script with dry-run and apply modes
- `backend/scripts/ROLLBACK_PROCEDURE.md` - Documentation for verification and rollback

### Modified Files
- `backend/package.json` - Added `migrate:2500-to-1500` npm script command

### Database Changes
- Updates `usersNew.credits` field for eligible users (multiplies by 1.6667)
- Creates audit logs in `migration_logs` collection with `scriptVersion: "2500-to-1500"`

### Behavioral Changes
- Existing users with credits > 0 will have their credit balances increased proportionally
- VND purchasing power is preserved: old_credits × 2500 VND = new_credits × 1500 VND
- No changes to refCredits, API endpoints, or user-facing UI

## Problem Statement

The system has transitioned from a 2500 VND/$1 rate to a 1500 VND/$1 rate. Users with existing credits purchased at the old rate need their credit balances adjusted to maintain the same VND purchasing power under the new rate.

**Example:**
- User has $149 credits at 2500 VND/$1 rate = 372,500 VND value
- Under new 1500 VND/$1 rate, this should be $248.33 credits = 372,500 VND value
- Formula: `new_credits = old_credits × (old_rate / new_rate) = old_credits × (2500 / 1500) = old_credits × 1.6667`

## Current State

- System now operates at 1500 VND/$1 rate (per RATE_UPDATE_1500.md)
- New purchases add credits at the new rate
- Existing users with pre-migration credits have incorrect credit values
- The `migration` field exists but is currently used for a different rate transition (1000 → 2500)

## Proposed Solution

Create a migration script (`backend/scripts/migrate-credits-2500-to-1500.ts`) that:

1. Identifies users with unmigrated credits from the 2500 rate period
2. Applies the conversion formula: `new_credits = old_credits × (2500 / 1500)`
3. Logs all migrations to `migration_logs` collection for audit trail
4. Provides dry-run mode for safe testing
5. Updates user records atomically to prevent race conditions

## Scope

**In Scope:**
- Migration script for credits conversion (2500 → 1500 rate)
- Audit logging of all migrations
- Dry-run capability for testing
- Safe atomic updates

**Out of Scope:**
- Frontend UI changes (no user-facing interface needed)
- API endpoint changes
- Referral credits migration (refCredits stay as-is in USD)
- Payment flow changes (already using new rate)

## Implementation Approach

The migration will be a one-time administrative script that:

1. Connects to MongoDB production database
2. Queries for users needing migration based on:
   - Users with `credits > 0`
   - Users who haven't been migrated for this specific rate change
3. For each user:
   - Calculate new credit value: `new_credits = old_credits × (2500 / 1500)`
   - Update user record with new credit amount
   - Log migration details to `migration_logs` collection
4. Provide summary statistics and verification

## Dependencies

- Requires read/write access to production MongoDB
- Uses existing `UserNew` model structure
- Uses existing `migration_logs` collection
- No frontend or API dependencies

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Double-migration of users | Check migration status before applying; log all migrations |
| Database connection failure | Implement connection retry; transaction rollback on error |
| Incorrect calculation | Dry-run mode; log old/new values for verification |
| Partial migration failure | Atomic per-user updates; resume capability via migration logs |

## Success Criteria

- All eligible users have credits converted using correct formula
- Zero data loss or corruption
- Complete audit trail in `migration_logs`
- Dry-run mode validates script before production run
- Script can be safely re-run (idempotent)

## Questions & Clarifications

1. **User identification**: Should we migrate ALL users with credits > 0, or only users with a specific date range or migration flag?
2. **Referral credits**: Should `refCredits` field also be migrated, or does it stay in USD?
3. **Migration marker**: Should we use the existing `migration` field or create a new field like `migration_2500_to_1500`?
4. **Precision**: Should we round to 2 decimal places or keep full precision for credit values?

## Related Work

- Previous migration: 1000 → 2500 rate transition (see `openspec/specs/rate-migration/spec.md`)
- Previous script: `backend/scripts/auto-migrate-zero-credits.ts`
- Current rate documentation: `RATE_UPDATE_1500.md`
