# Tasks: migrate-credits-2500-to-1500

## Overview

Implementation tasks for creating and executing the credit rate migration script (2500 → 1500 VND/$1).

## Task List

### Phase 1: Script Development

- [x] **Create migration script file structure**
   - Create `backend/scripts/migrate-credits-2500-to-1500.ts`
   - Set up TypeScript compilation for scripts directory
   - Add npm script command: `"migrate:2500-to-1500": "tsx backend/scripts/migrate-credits-2500-to-1500.ts"`
   - **Validation:** File exists and compiles without errors

- [x] **Implement database connection setup**
   - Import mongoose and connect to MongoDB using environment variable or connection string
   - Add connection error handling with retry logic
   - Add graceful disconnect on script completion
   - **Validation:** Script can connect to MongoDB successfully

- [x] **Define TypeScript interfaces**
   - Define `MigrationLog` interface with all required fields
   - Define user schema interface matching `UserNew` model
   - Add type safety for migration calculation results
   - **Validation:** TypeScript compilation passes with strict mode

- [x] **Implement user query logic**
   - Query `usersNew` collection for users with `credits > 0`
   - Check `migration_logs` collection to skip already-migrated users with `scriptVersion: "2500-to-1500"`
   - Add optional `--include-admins` flag to include/exclude admin accounts
   - Sort results by `_id` for consistent ordering
   - **Validation:** Query returns correct users based on criteria

- [x] **Implement credit conversion formula**
   - Create function: `calculateNewCredits(oldCredits: number): number`
   - Formula: `oldCredits × (2500 / 1500)` with proper precision
   - Round result to 2 decimal places (cents precision)
   - Add unit tests for conversion examples from spec
   - **Validation:** All test cases from spec pass (100→166.67, 149→248.33, etc.)

- [x] **Implement dry-run mode**
   - Parse command-line argument: `--dry-run` (default) vs `--apply`
   - In dry-run mode, display affected users (first 10 as sample)
   - Show calculated new values without database modification
   - Display total users count and estimated credit increase
   - Show instruction to run with `--apply`
   - **Validation:** Dry-run mode displays data but makes no changes

- [x] **Implement apply mode with atomic updates**
   - Use `mongoose.connection.collection('usersNew').updateOne()` for atomic updates
   - Update with `$set: { credits: newCredits }`
   - Process users in loop with error handling per user
   - Display progress indicator for every 50th user or first 10 users
   - **Validation:** Credits are updated correctly in database

- [x] **Implement migration audit logging**
   - Insert document to `migration_logs` collection after successful migration
   - Include all required fields: userId, oldCredits, newCredits, oldRate, newRate, scriptVersion
   - Add `scriptVersion: "2500-to-1500"` to distinguish from previous migrations
   - Handle logging failures gracefully (log to console but continue)
   - **Validation:** Migration logs are created with correct data

- [x] **Implement error handling**
   - Wrap database operations in try-catch blocks
   - Log failed user migrations to console with error details
   - Continue processing remaining users on individual failures
   - Exit with code 1 on critical errors (connection failure)
   - Exit with code 0 on success
   - **Validation:** Script handles errors without crashing

- [x] **Implement execution summary**
    - Track counters: successful, skipped (already migrated), skipped (zero credits), failed
    - Calculate total credits before/after and percentage increase
    - Display comprehensive summary at end of execution
    - Query and display remaining unmigrated users count
    - **Validation:** Summary displays accurate statistics

### Phase 2: Testing

- [ ] **Test on development database**
    - Set up test MongoDB database with sample users
    - Create test users with various credit amounts (0, 1, 50, 100, 149)
    - Run script in dry-run mode and verify output
    - **Validation:** Dry-run shows correct calculations

- [ ] **Test apply mode on development**
    - Run script with `--apply` on test database
    - Verify credits are updated with correct formula
    - Verify migration logs are created
    - Run script again to verify idempotency (skips already-migrated)
    - **Validation:** All users migrated correctly, no duplicates

- [ ] **Test error scenarios**
    - Test with invalid MongoDB URI (should fail gracefully)
    - Test with interrupted connection (should handle error)
    - Manually interrupt script mid-execution, then re-run (should resume)
    - **Validation:** Script handles errors and supports resumability

- [ ] **Verify referral credits unchanged**
    - Create test user with both `credits` and `refCredits`
    - Run migration
    - Verify only `credits` changed, `refCredits` unchanged
    - **Validation:** `refCredits` field remains unchanged

### Phase 3: Documentation

- [x] **Add script usage documentation**
    - Add README section or script header comments with usage instructions
    - Document command-line flags: `--dry-run`, `--apply`, `--include-admins`
    - Provide example commands
    - Document expected output format
    - **Validation:** Documentation is clear and complete

- [x] **Document rollback procedure**
    - Document how to verify migration success
    - Provide SQL/query to check migration logs
    - Document manual rollback steps if needed (reverse formula: ÷ 1.6667)
    - **Validation:** Rollback procedure is documented

### Phase 4: Production Execution

- [ ] **Pre-migration backup**
    - Create MongoDB backup of production `usersNew` collection
    - Verify backup integrity
    - Document backup location and restoration procedure
    - **Validation:** Backup created and verified

- [ ] **Run dry-run on production**
    - Execute script with `--dry-run` on production database (read-only)
    - Review output for affected users count and sample calculations
    - Get stakeholder approval for migration
    - **Validation:** Dry-run output reviewed and approved

- [ ] **Execute migration on production**
    - Schedule maintenance window (if needed)
    - Run script with `--apply` on production database
    - Monitor execution progress and logs
    - Verify no errors during execution
    - **Validation:** Migration completes successfully with 0 errors

- [ ] **Post-migration verification**
    - Query `migration_logs` to verify all users logged
    - Spot-check 10-20 random users to verify credit amounts
    - Verify no unmigrated users remain: `db.usersNew.countDocuments({ credits: { $gt: 0 }, ... })`
    - Check for any user complaints or issues
    - **Validation:** All verifications pass, no issues reported

- [ ] **Update system documentation**
    - Update `RATE_UPDATE_1500.md` with migration completion date
    - Document migration statistics (users migrated, total credits adjusted)
    - Archive migration script for future reference
    - **Validation:** Documentation updated

## Dependencies

- MongoDB production access credentials
- `tsx` or `ts-node` for TypeScript execution
- Mongoose ODM library
- Production database backup capability

## Parallelizable Tasks

- Tasks 15-16 (documentation) can be done in parallel with testing (Phase 2)
- Tasks 11-14 (testing) can be parallelized if using separate test databases

## Critical Path

Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 17 → 18 → 19 → 20

## Estimated Completion

All tasks should be completable in a single development session (2-4 hours), with production execution requiring coordination for maintenance window.
