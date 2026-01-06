# Implementation Tasks

## Phase 1: Backend Infrastructure

### Task 1.1: Update MigrationLog Model
- [x] Add `autoMigrated: { type: Boolean, default: false }` field to MigrationLog schema
- [x] Update IMigrationLog interface with autoMigrated field
- [x] Update setMigrated repository method to accept autoMigrated parameter

**Validation**: Model updated at `backend/src/models/migration-log.model.ts:23`

### Task 1.2: Add Auto-Migration Method to MigrationService
- [x] Add `autoMigrateIfZeroCredits(userId: string): Promise<boolean>` method to MigrationService
- [x] Implement logic: if `migration: false` and `credits === 0`, set `migration: true`
- [x] Create migration log entry with `autoMigrated: true`, `oldCredits: 0`, `newCredits: 0`
- [x] Return `true` if auto-migrated, `false` otherwise (already migrated or has credits)
- [x] Handle edge case: user with 0 credits but positive refCredits (auto-migrates)

**Validation**: Service updated at `backend/src/services/migration.service.ts:49-72`

## Phase 2: Middleware Integration

### Task 2.1: Update Migration Check Middleware
- [x] Import `migrationService.autoMigrateIfZeroCredits` in middleware
- [x] Before blocking request, call `autoMigrateIfZeroCredits(userId)`
- [x] If auto-migration succeeds, allow request to proceed
- [x] If auto-migration returns false (user has credits), block as before
- [x] Import migrationService in middleware

**Validation**: Middleware updated at `backend/src/middleware/migration-check.ts:28-35`

## Phase 3: Backend Routes

### Task 3.1: Update User Profile Endpoint
- [x] In `GET /api/user/profile` handler, call `autoMigrateIfZeroCredits(userId)`
- [x] Return updated `migration: true` status if auto-migrated
- [x] Ensure response includes current migration status
- [x] Import migrationService in UserService

**Validation**: UserService updated at `backend/src/services/user.service.ts:36-79`

## Phase 4: Frontend Updates

### Task 4.1: Verify MigrationBanner Hiding Logic
- [x] Confirm MigrationBanner component already checks `migration: true`
- [x] Dashboard only renders banner when `!userProfile.migration` (line 291)
- [x] Frontend will receive `migration: true` after auto-migration

**Validation**: No frontend changes needed - existing logic at `frontend/src/app/(dashboard)/dashboard/page.tsx:291`

## Phase 5: Database Migration Script

### Task 5.1: Create Auto-Migration Script
- [x] Create `backend/scripts/auto-migrate-zero-credits.ts`
- [x] Implement dry-run mode: find all users with `migration: false` and `credits: 0`
- [x] Display count and list of affected users in dry-run
- [x] Implement apply mode: update all affected users to `migration: true`
- [x] Create migration log entries for each user with `autoMigrated: true`
- [x] Add progress logging and error handling

**Validation**: Script created at `backend/scripts/auto-migrate-zero-credits.ts`

### Task 5.2: Execute Database Migration
- [ ] Run auto-migration script on development database
- [ ] Verify zero-credit users now have `migration: true`
- [ ] Verify migration_logs entries created with `autoMigrated: true`
- [ ] Document migration results

**To run**: `npx tsx backend/scripts/auto-migrate-zero-credits.ts` (dry-run) or `--apply` (apply)

## Phase 6: Testing & Validation

### Task 6.1: Integration Testing
- [ ] Test full flow: zero-credit user attempts API access
- [ ] Test full flow: zero-credit user visits dashboard
- [ ] Test that positive-credit users still require manual migration
- [ ] Test idempotency: call auto-migrate twice on same user
- [ ] Test admin bypass still works
- [ ] Test edge case: user with 0 credits but positive refCredits

**Validation**: All integration tests pass, migration UI only shows for users with credits > 0

### Task 6.2: Production Deployment
- [ ] Deploy backend changes to production
- [ ] Run auto-migration script on production database (in apply mode)
- [ ] Monitor migration logs for errors
- [ ] Verify zero-credit users can access API without migration
- [ ] Verify positive-credit users still see migration UI

**Validation**: Production smoke tests pass, no errors in logs

## Dependencies

- Task 1.1 must complete before Task 1.2 (MigrationLog model needed for service)
- Task 1.2 must complete before Task 2.1 and 3.1 (service method needed by middleware/routes)
- Task 4.1 can run in parallel with backend tasks (frontend logic already exists)
- Task 5.1 can run in parallel with Phase 2-3 (script is independent)
- Task 5.2 must complete after Task 5.1 (script must exist before execution)
- Task 6.1 must complete after all implementation tasks (requires full implementation)
- Task 6.2 must complete after Task 6.1 (testing before production)

## Parallelization Opportunities

- **Phase 1 & Phase 4**: Backend model updates and frontend verification can happen in parallel
- **Phase 2 & Phase 3**: Middleware and route updates can be done in parallel
- **Phase 5**: Database migration script can be developed while integration tasks are in progress

## Rollback Plan

If issues arise:
1. Revert backend code changes (middleware, service, routes)
2. MigrationLog schema change is backward compatible (new field has default)
3. Users auto-migrated can be identified by `autoMigrated: true` in logs
4. Can manually revert `migration: true` to `false` for affected users if needed
