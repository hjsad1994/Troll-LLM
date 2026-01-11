# Specification: Credit Rate Migration Script (2500 → 1500)

## Overview

This specification defines a one-time migration script to convert user credit balances from the old 2500 VND/$1 rate to the new 1500 VND/$1 rate while preserving the VND purchasing power.

## ADDED Requirements

### Requirement: Migration Script Execution
The system SHALL provide a command-line migration script that converts user credits from the 2500 VND/$1 rate to the 1500 VND/$1 rate.

#### Scenario: Dry-run mode validates migration
- **Given** the script is executed with `--dry-run` flag
- **And** there are 5 users with unmigrated credits
- **When** the script analyzes the database
- **Then** it SHALL display:
  - Total number of users to be migrated
  - Sample users (first 10) with their current credits
  - Calculated new credit values using formula: `new_credits = old_credits × (2500 / 1500)`
  - Estimated total credit increase
- **And** it SHALL NOT modify any database records
- **And** it SHALL display instruction: "To apply changes, run with: --apply"

#### Scenario: Apply mode migrates user credits
- **Given** the script is executed with `--apply` flag
- **And** user "alice" has 100 credits at old rate (2500 VND/$1)
- **When** the script processes user "alice"
- **Then** user credits SHALL be updated to 166.67 (100 × 2500 / 1500)
- **And** the update SHALL be atomic (single database operation)
- **And** a migration log SHALL be created with:
  - `userId: "alice"`
  - `oldCredits: 100`
  - `newCredits: 166.67`
  - `oldRate: 2500`
  - `newRate: 1500`
  - `migratedAt: [current timestamp]`
  - `scriptVersion: "2500-to-1500"`
- **And** the script SHALL display progress: "✓ Migrated: alice (100 → 166.67)"

#### Scenario: Skip already-migrated users
- **Given** the script is executed with `--apply` flag
- **And** user "bob" already has a migration log with `scriptVersion: "2500-to-1500"`
- **When** the script processes the database
- **Then** user "bob" SHALL be skipped
- **And** the script SHALL NOT update bob's credits
- **And** the script SHALL NOT create duplicate migration log
- **And** the summary SHALL show: "Skipped: 1 (already migrated)"

#### Scenario: Handle zero-credit users
- **Given** the script is executed with `--apply` flag
- **And** user "charlie" has 0 credits
- **When** the script processes user "charlie"
- **Then** user "charlie" SHALL be skipped from migration
- **And** no migration log SHALL be created for charlie
- **And** the script SHALL display: "Skipped: charlie (zero credits)"

### Requirement: Migration User Selection
The script SHALL identify users requiring migration based on specific criteria.

#### Scenario: Query unmigrated users with credits
- **Given** the script queries the `usersNew` collection
- **When** determining eligible users
- **Then** it SHALL select users WHERE:
  - `credits > 0`
  - No migration log exists with `scriptVersion: "2500-to-1500"` for this userId
- **And** it SHALL exclude users with zero credits
- **And** it SHALL return users sorted by `_id` (alphabetically)

#### Scenario: Filter admin accounts optionally
- **Given** the script is executed with `--include-admins` flag
- **When** querying for eligible users
- **Then** admin users (role='admin') SHALL be included in migration
- **And** without the flag, admin users SHALL be excluded by default

### Requirement: Credit Conversion Formula
The script SHALL calculate new credit values using the rate conversion formula with proper precision.

#### Scenario: Apply conversion formula
- **Given** user has credits at old rate 2500 VND/$1
- **When** calculating new credits for 1500 VND/$1 rate
- **Then** the formula SHALL be: `new_credits = old_credits × (2500 / 1500)`
- **And** the multiplier SHALL be: 1.6667 (rounded to 4 decimal places for calculation)
- **And** the result SHALL be rounded to 2 decimal places (cents precision)

#### Scenario: Conversion examples validation
| Old Credits ($) | Old Rate | New Rate | Expected New Credits ($) |
|-----------------|----------|----------|--------------------------|
| 100.00          | 2500     | 1500     | 166.67                   |
| 149.00          | 2500     | 1500     | 248.33                   |
| 50.50           | 2500     | 1500     | 84.17                    |
| 1.00            | 2500     | 1500     | 1.67                     |

- **Given** the conversion formula is implemented
- **When** these test values are processed
- **Then** the calculated results SHALL match the expected values exactly

#### Scenario: Preserve VND value
- **Given** user has $149 credits at 2500 VND/$1
- **When** calculating VND value: $149 × 2500 = 372,500 VND
- **And** converting to new rate: 372,500 ÷ 1500 = 248.33 credits
- **Then** the VND purchasing power SHALL remain 372,500 VND
- **And** the new credit amount SHALL be $248.33

### Requirement: Migration Audit Logging
The script SHALL log all migration operations to the `migration_logs` collection for complete audit trail.

#### Scenario: Create migration log entry
- **Given** user "david" is successfully migrated
- **When** the migration completes
- **Then** a document SHALL be inserted into `migration_logs` with:
  ```javascript
  {
    userId: "david",
    username: "david",  // Copy from user._id
    oldCredits: 100.00,
    newCredits: 166.67,
    migratedAt: ISODate("2026-01-11T10:30:00Z"),
    oldRate: 2500,
    newRate: 1500,
    scriptVersion: "2500-to-1500",
    appliedBy: "admin",  // Or script execution context
    notes: "Automatic rate migration from 2500 to 1500 VND/$"
  }
  ```

#### Scenario: Log migration failures
- **Given** the script fails to update user "eve" due to database error
- **When** the error is caught
- **Then** the script SHALL log to console: "✗ Failed: eve - [error message]"
- **And** the script SHALL continue processing remaining users
- **And** the final summary SHALL include: "Failed: 1"
- **And** NO migration log SHALL be created for failed migrations

### Requirement: Script Execution Summary
The script SHALL provide detailed summary statistics after execution.

#### Scenario: Display comprehensive summary
- **Given** the script has processed all users
- **When** execution completes
- **Then** it SHALL display:
  ```
  === MIGRATION SUMMARY ===
  Total users processed: 150
  Successfully migrated: 145
  Skipped (already migrated): 3
  Skipped (zero credits): 2
  Failed: 0

  Total credits before: $12,450.00
  Total credits after: $20,750.00
  Total increase: $8,300.00 (+66.67%)
  ```

#### Scenario: Verify migration completion
- **Given** the script completes with `--apply` flag
- **When** verifying results
- **Then** the script SHALL query remaining eligible users
- **And** display: "Remaining unmigrated users: 0"
- **And** exit with code 0 on success

### Requirement: Error Handling & Recovery
The script SHALL handle errors gracefully and support resumability.

#### Scenario: Handle database connection failure
- **Given** MongoDB connection fails during execution
- **When** the connection error is detected
- **Then** the script SHALL log: "Error: Database connection failed - [error details]"
- **And** the script SHALL exit with code 1
- **And** it SHALL NOT partially update any user records

#### Scenario: Recover from partial migration
- **Given** the script was interrupted after migrating 50 of 100 users
- **When** the script is re-run with `--apply`
- **Then** it SHALL skip the 50 already-migrated users (via migration log check)
- **And** it SHALL continue migrating the remaining 50 users
- **And** it SHALL display: "Skipped: 50 (already migrated)"

#### Scenario: Atomic user updates
- **Given** the script is updating user "frank"'s credits
- **When** a concurrent process tries to modify frank's credits
- **Then** the MongoDB update operation SHALL use atomic `$set` operation
- **And** the update SHALL include a condition check to prevent race conditions
- **And** if the update fails due to concurrent modification, it SHALL be retried once

### Requirement: Referral Credits Handling
The script SHALL NOT modify referral credits (`refCredits`) as they are already denominated in USD.

#### Scenario: Preserve referral credits
- **Given** user "grace" has:
  - `credits: 100` (purchased credits)
  - `refCredits: 50` (referral bonus)
- **When** the script migrates grace's account
- **Then** `credits` SHALL be updated to 166.67
- **And** `refCredits` SHALL remain 50 (unchanged)
- **And** the migration log SHALL only record the `credits` change

## MODIFIED Requirements

None. This is a new capability with no modifications to existing specifications.

## REMOVED Requirements

None. This is an additive change with no removals.

## Cross-References

- **Related Specs:**
  - `rate-migration` (openspec/specs/rate-migration/spec.md) - Previous 1000 → 2500 migration system
  - `billing` (openspec/specs/billing/spec.md) - Credit-based billing model

- **Dependencies:**
  - UserNew model (`backend/src/models/user-new.model.ts`)
  - MongoDB connection configuration
  - Migration logs collection schema

- **Impacts:**
  - No user-facing changes (administrative script only)
  - No API endpoint changes
  - No frontend changes
  - Database: Updates `usersNew` collection, writes to `migration_logs` collection
