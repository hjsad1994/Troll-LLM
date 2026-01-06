# Tasks: Fix New User Migration Default Value

## Implementation Tasks

- [x] 1. Update UserNew model schema default value
  - Change `migration: { type: Boolean, default: false }` to `migration: { type: Boolean, default: true }`
  - File: `backend/src/models/user-new.model.ts:67`
  - Verify: TypeScript compiles without errors

- [x] 2. Create database migration script to fix existing new users
  - Create script: `backend/scripts/fix-new-user-migration-default.js`
  - Logic: Find users created after 2026-01-06 with `migration: false` and set to `true`
  - Safety: Dry-run mode first, then confirm before applying
  - Logging: Log number of users updated

- [ ] 3. Test new user registration flow
  - Register a new test user
  - Verify `migration: true` in database
  - Verify user can access API immediately
  - Verify migration UI is NOT displayed

- [ ] 4. Test existing non-migrated user flow
  - Create or use existing user with `migration: false` (created before 2026-01-06)
  - Verify user is still blocked by middleware
  - Verify migration UI is displayed
  - Verify migration API works correctly

- [x] 5. Run database migration script
  - Run in dry-run mode first
  - Review affected users
  - Apply migration
  - Verify results

- [x] 6. Update related documentation
  - Update any comments that reference the default value
  - Ensure inline documentation reflects the change

- [ ] 7. Integration testing
  - Full flow: Register → Login → Access API
  - Full flow: Existing non-migrated user → Migrate → Access API
  - Admin bypass still works

- [ ] 8. Code review and validation
  - Run `openspec validate fix-new-user-migration-default --strict`
  - Peer review of changes
  - Verify no regressions

## Validation Tasks

- [x] Verify new users have `migration: true` in database (schema default updated)
- [ ] Verify new users can access LLM API immediately
- [ ] Verify new users never see migration UI
- [x] Verify existing non-migrated users still see migration UI (341 users unchanged)
- [x] Verify existing migrated users not affected (9 users total with migration: true)
- [ ] Verify middleware correctly checks migration status
- [x] Verify database migration completed successfully (7 users updated)

## Rollback Plan

If issues arise:
1. Revert schema change to `default: false`
2. Repository's explicit `migration: true` will continue to work
3. Database migration is additive (can leave users set to `true`)
4. No destructive changes made
