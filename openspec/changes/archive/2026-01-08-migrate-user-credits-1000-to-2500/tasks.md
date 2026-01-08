# Tasks: Migration Script Implementation

## Overview

This document lists the implementation tasks for creating a one-time migration script to migrate user credits from rate 1000 to 2500.

---

## Task 1: Set up project structure and dependencies

**Description:** Create the script file and ensure all necessary dependencies are available.

**Steps:**
1. Create file `backend/src/scripts/migrate-credits-1000-to-2500.ts`
2. Verify `mongoose` is available in `package.json`
3. Verify `dotenv` is available in `package.json`
4. Add npm script command in `backend/package.json`:
   ```json
   "migrate-credits": "ts-node src/scripts/migrate-credits-1000-to-2500.ts"
   ```

**Validation:**
- File exists at correct path
- Running `npm run migrate-credits` executes without "command not found" error

**Dependencies:** None

---

## Task 2: Implement MongoDB connection and environment setup

**Description:** Set up database connection using environment variables.

**Steps:**
1. Import required dependencies (`mongoose`, `dotenv`)
2. Load environment variables with `dotenv/config()`
3. Implement connection function using `MONGODB_URI` and `MONGODB_DB_NAME`
4. Add error handling for missing `MONGODB_URI`
5. Implement graceful disconnect on completion

**Validation:**
- Script connects successfully to MongoDB with valid credentials
- Script exits with error code 1 when `MONGODB_URI` is missing
- Script disconnects properly after execution

**Dependencies:** Task 1

---

## Task 3: Define data models (inline)

**Description:** Define Mongoose schemas for UserNew and MigrationLog within the script.

**Steps:**
1. Create `UserNew` schema with fields: `_id`, `credits`, `migration`, `role`, `createdAt`
2. Create `MigrationLog` schema with fields: `userId`, `username`, `oldCredits`, `newCredits`, `migratedAt`, `oldRate`, `newRate`, `autoMigrated`
3. Compile models for `usersNew` and `migration_logs` collections

**Validation:**
- Schemas match existing database structure
- Models can query existing data without errors

**Dependencies:** Task 2

---

## Task 4: Implement credit calculation function

**Description:** Create function to calculate new credits from old credits.

**Steps:**
1. Define `RATE_RATIO = 2.5` constant
2. Implement `calculateNewCredits(oldCredits: number): number` function
3. Add rounding to 4 decimal places: `Math.round(value * 10000) / 10000`
4. Add unit tests (optional, as comments in code)

**Validation:**
- `calculateNewCredits(50)` returns `20`
- `calculateNewCredits(0)` returns `0`
- `calculateNewCredits(100)` returns `40`
- Preserves 4 decimal places for fractional values

**Dependencies:** None

---

## Task 5: Implement dry-run mode query and display

**Description:** Query and display users without making database changes in dry-run mode.

**Steps:**
1. Parse CLI arguments to detect `--apply` flag
2. Set `dryRun = !args.includes('--apply')`
3. Query users with `{ migration: false }`
4. Display formatted header with mode indication
5. Display user count
6. Display formatted table with columns: Username, Old Credits, New Credits
7. Display summary with totals
8. Display "DRY RUN COMPLETE" message

**Validation:**
- Dry-run is default when no `--apply` flag
- No database writes occur in dry-run mode
- Table is properly formatted with aligned columns
- Summary shows correct totals

**Dependencies:** Task 3, Task 4

---

## Task 6: Implement apply mode migration logic

**Description:** Execute actual migration when `--apply` flag is provided.

**Steps:**
1. Detect apply mode from CLI args
2. Query users with `{ migration: false }`
3. For each user:
   - Calculate new credits
   - Update user record: `migration: true`, `credits: newCredits`
   - Create migration log entry
   - Handle errors (log and continue)
4. Track success/failure counts
5. Display progress every 10 users
6. Display final results summary

**Validation:**
- Only runs when `--apply` flag is present
- Successfully updates `migration` from `false` to `true`
- Successfully updates `credits` to new value
- Creates migration log for each success
- Continues processing after individual failures

**Dependencies:** Task 3, Task 4

---

## Task 7: Implement error handling and logging

**Description:** Add comprehensive error handling and detailed logging.

**Steps:**
1. Wrap user migration in try-catch blocks
2. Log each success with username and credit change
3. Log each failure with username and error message
4. Implement progress indicator (every 10 users)
5. Add summary statistics at end:
   - Total users
   - Successfully migrated
   - Failed
   - Total old credits
   - Total new credits
6. Handle database connection errors
7. Handle missing environment variables

**Validation:**
- Individual user failures don't stop script
- All errors are logged with context
- Summary accurately reflects results
- Script exits with code 0 on success, code 1 on critical failure

**Dependencies:** Task 6

---

## Task 8: Test script in dry-run mode

**Description:** Validate script behavior in dry-run mode.

**Steps:**
1. Run script without `--apply` flag
2. Verify no database changes occur
3. Verify output shows correct user count
4. Verify table displays correctly
5. Verify summary calculations are correct
6. Test with no users to migrate (edge case)

**Validation:**
- No records modified in `usersNew` collection
- No records added to `migration_logs` collection
- Output matches specification format

**Dependencies:** Task 5, Task 7

---

## Task 9: Test script in apply mode (test database)

**Description:** Validate script behavior in apply mode using test database.

**Steps:**
1. Set up test database or use development environment
2. Create test users with `migration: false` and various credit amounts
3. Run script with `--apply` flag
4. Verify users updated correctly:
   - `migration` changed to `true`
   - `credits` calculated correctly
5. Verify migration logs created with correct data
6. Verify error handling with intentionally bad data
7. Test idempotency: run again, verify already migrated users skipped

**Validation:**
- All test users migrated correctly
- Migration logs contain accurate data
- Failed users handled gracefully
- Re-running skips already migrated users

**Dependencies:** Task 6, Task 7, Task 8

---

## Task 10: Create usage documentation

**Description:** Document how to use the migration script.

**Steps:**
1. Create `README.md` or add comments at top of script
2. Document prerequisites (MongoDB access, environment variables)
3. Document usage:
   - Dry-run command
   - Apply command
4. Document output format
5. Add warning about running off-hours
6. Add backup recommendation before apply

**Validation:**
- Documentation is clear and complete
- Another developer can run script successfully using documentation

**Dependencies:** Task 9

---

## Execution Order

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10
```

**Parallelizable:**
- Task 4 can be done in parallel with Task 2-3

**Critical Path:**
1. Set up (Tasks 1-3)
2. Core logic (Tasks 4-7)
3. Testing (Tasks 8-9)
4. Documentation (Task 10)

---

## Estimated Completion

- Total tasks: 10
- Estimated effort: 2-3 hours
- Blocking dependencies: All tasks must complete before production use
