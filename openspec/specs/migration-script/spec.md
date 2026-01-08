# migration-script Specification

## Purpose
TBD - created by archiving change migrate-user-credits-1000-to-2500. Update Purpose after archive.
## Requirements
### Requirement: Migration Script Existence

The project SHALL provide a standalone TypeScript script to migrate user credits from the old billing rate (1,000 VNĐ/$) to the new billing rate (2,500 VNĐ/$) for users who have not yet migrated.

#### Scenario: Script file exists
- **Given** the project directory structure
- **When** navigating to `backend/src/scripts/`
- **Then** a file `migrate-credits-1000-to-2500.ts` SHALL exist
- **And** the file SHALL be executable via Node.js

#### Scenario: Script npm command exists
- **Given** the `package.json` in `backend/`
- **When** reading the `scripts` section
- **Then** a command `migrate-credits` SHALL be defined
- **And** the command SHALL execute the migration script
- **And** the command SHALL accept `--apply` flag

### Requirement: Dry Run Mode

The migration script SHALL support dry-run mode to preview changes without modifying the database.

#### Scenario: Default execution is dry-run
- **Given** the migration script exists
- **When** running `npm run migrate-credits` (without --apply)
- **Then** the script SHALL connect to MongoDB in read-only mode
- **And** the script SHALL query users with `migration: false`
- **And** the script SHALL display affected users in a formatted table
- **And** the script SHALL display migration summary (counts, totals)
- **And** the script SHALL NOT modify any database records
- **And** the script SHALL exit with code 0

#### Scenario: Dry-run output format
- **Given** the script is running in dry-run mode
- **When** displaying results
- **Then** the output SHALL include:
  - Header: "=== MIGRATION SCRIPT (DRY RUN) ==="
  - User count: "Found X users with migration: false"
  - Table with columns: Username, Old Credits, New Credits
  - Summary: Total users, Total old credits, Total new credits
  - Footer: "DRY RUN COMPLETE - No changes made"

#### Scenario: Dry-run with no users to migrate
- **Given** all users already have `migration: true`
- **When** running the script in dry-run mode
- **Then** the script SHALL display "No users need migration"
- **And** the script SHALL exit successfully

### Requirement: Apply Mode

The migration script SHALL support apply mode to execute the actual migration when `--apply` flag is provided.

#### Scenario: Apply mode with --apply flag
- **Given** the migration script exists
- **When** running `npm run migrate-credits -- --apply`
- **Then** the script SHALL connect to MongoDB in read-write mode
- **And** the script SHALL query users with `migration: false`
- **And** the script SHALL process each user sequentially
- **And** for each user, the script SHALL:
  - Calculate new credits as `oldCredits / 2.5`
  - Update user record: set `migration: true`, update `credits`
  - Insert migration log record
  - Handle errors gracefully (continue with next user)
- **And** the script SHALL display progress during execution
- **And** the script SHALL display final results

#### Scenario: Apply mode output format
- **Given** the script is running in apply mode
- **When** displaying results
- **Then** the output SHALL include:
  - Header: "=== MIGRATION SCRIPT (APPLY) ==="
  - User count: "Found X users with migration: false"
  - Progress indicators during processing
  - Success/failure indicators per user
  - Results table: Successfully migrated, Failed, Skipped
  - Summary: Total old credits, Total new credits, Credits reduced
  - Footer: "MIGRATION COMPLETE"

### Requirement: Credit Calculation

The script SHALL calculate new credits by dividing old credits by 2.5 (the ratio between 2500 and 1000).

#### Scenario: Credit calculation formula
- **Given** a user with `credits: 50` (at rate 1000)
- **When** the migration is processed
- **Then** the new credits SHALL be `20` (50 / 2.5)
- **And** the calculation SHALL preserve 4 decimal places
- **And** rounding SHALL use standard mathematical rounding

#### Scenario: Zero credits migration
- **Given** a user with `credits: 0`
- **When** the migration is processed
- **Then** the new credits SHALL be `0`
- **And** the migration SHALL still complete successfully
- **And** `migration` SHALL be set to `true`

#### Scenario: Large credits migration
- **Given** a user with `credits: 1000` (at rate 1000)
- **When** the migration is processed
- **Then** the new credits SHALL be `400` (1000 / 2.5)
- **And** the calculation SHALL not overflow or lose precision

### Requirement: Database Query Targeting

The script SHALL only target users who have not yet migrated (`migration: false`).

#### Scenario: Query only non-migrated users
- **Given** the `usersNew` collection contains mixed migration status
- **When** the script queries for users to migrate
- **Then** the query SHALL filter by `{ migration: false }`
- **And** users with `migration: true` SHALL be excluded
- **And** users with `migration: undefined` SHALL be included (treated as false)

#### Scenario: Skip already migrated users
- **Given** a user with `migration: true`
- **When** the migration script processes users
- **Then** the user SHALL be skipped (not processed)
- **And** the user's credits SHALL remain unchanged
- **And** no migration log SHALL be created for this user

### Requirement: Migration Log Creation

The script SHALL create a migration log entry for each successfully migrated user in the `migration_logs` collection.

#### Scenario: Create migration log on success
- **Given** a user with `migration: false` and `credits: 50`
- **When** the user is successfully migrated in apply mode
- **Then** a migration log SHALL be created with:
  - `userId`: user's _id
  - `username`: user's _id (or username if available)
  - `oldCredits: 50`
  - `newCredits: 20`
  - `migratedAt`: current Date
  - `oldRate: 1000`
  - `newRate: 2500`
  - `autoMigrated: false` (manual script migration)

#### Scenario: No migration log on failure
- **Given** a user fails to migrate (database error)
- **When** the migration fails
- **Then** NO migration log SHALL be created
- **And** the user's `migration` status SHALL remain `false`
- **And** the user's credits SHALL remain unchanged

### Requirement: Error Handling

The script SHALL handle errors gracefully and continue processing remaining users when one user fails.

#### Scenario: Continue on individual user failure
- **Given** 10 users need migration
- **When** user #3 fails to migrate (e.g., database error)
- **Then** the script SHALL log the error for user #3
- **And** the script SHALL continue processing user #4, #5, etc.
- **And** the final report SHALL show "Failed: 1, Successfully migrated: 9"

#### Scenario: Handle database connection errors
- **Given** the script starts
- **When** MongoDB connection fails
- **Then** the script SHALL exit with error code 1
- **And** an error message SHALL be displayed
- **And** no database changes SHALL be made

#### Scenario: Handle missing environment variables
- **Given** the script starts
- **When** `MONGODB_URI` is not set
- **Then** the script SHALL display "MONGODB_URI not set"
- **And** the script SHALL exit with error code 1
- **And** no connection SHALL be attempted

### Requirement: Detailed Logging

The script SHALL provide detailed console output for visibility and debugging.

#### Scenario: Progress logging during migration
- **Given** 100 users need migration
- **When** the script processes users
- **Then** progress SHALL be displayed every 10 users
- **And** each success SHALL be logged with username and credit change
- **And** each failure SHALL be logged with username and error message

#### Scenario: Summary statistics
- **Given** the migration script completes (dry-run or apply)
- **When** displaying final results
- **Then** the summary SHALL include:
  - Total users processed
  - Successfully migrated count (apply mode only)
  - Failed count (apply mode only)
  - Total old credits sum
  - Total new credits sum
  - Percentage reduction (apply mode only)

#### Scenario: Table formatting
- **Given** the script displays user details
- **When** rendering the user table
- **Then** columns SHALL be aligned with padding
- **And** credits SHALL be formatted as currency ($X.XX)
- **And** table SHALL have separator lines

### Requirement: Idempotency

The migration script SHALL be idempotent - running it multiple times shall not cause duplicate migrations or incorrect data.

#### Scenario: Re-running script on already migrated users
- **Given** a user with `migration: true`
- **When** the script runs again (dry-run or apply)
- **Then** the user SHALL be skipped
- **And** the user's credits SHALL NOT be modified again
- **And** no duplicate migration log SHALL be created

#### Scenario: Re-running script after partial failure
- **Given** 10 users, 6 migrated successfully, 4 failed
- **When** the script runs again
- **Then** the 6 already migrated users SHALL be skipped
- **And** the 4 failed users SHALL be attempted again
- **And** successful migrations SHALL create new migration logs

