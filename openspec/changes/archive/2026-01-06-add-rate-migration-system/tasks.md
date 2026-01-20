# Implementation Tasks

## Task Order and Dependencies

### Phase 1: Database & Backend Model

- [x] **1.1 Update UserNew model schema**
  - File: `backend/src/models/user-new.model.ts`
  - Add `migration: { type: Boolean, default: false }` field to schema
  - Update `IUserNew` interface to include `migration: boolean`
  - Verify: Model compiles without errors

- [x] **1.2 Update registration to set migration=true for new users**
  - File: `backend/src/routes/` or registration service
  - When new user registers, set `migration: true` automatically
  - This indicates new users are on the new rate (no migration needed)
  - Verify: New users have `migration: true` after registration

- [x] **1.3 Create MigrationLog model**
  - File: `backend/src/models/migration-log.model.ts` (new file)
  - Create `IMigrationLog` interface with fields: userId, username, oldCredits, newCredits, migratedAt, oldRate, newRate
  - Create mongoose schema for `migration_logs` collection
  - Add indexes on `userId` and `migratedAt` for efficient querying
  - Verify: Model compiles without errors

- [x] **1.4 Create migration repository methods**
  - File: `backend/src/repositories/user-new.repository.ts`
  - Add `setMigrated(userId: string)` method to update migration status and calculate new credits
  - Add `getMigrationStatus(userId: string)` method to check migration status
  - **Add migration logging logic to insert record into `migration_logs` collection**
  - Verify: Methods return correct types and log is created

- [x] **1.5 Create migration service**
  - File: `backend/src/services/migration.service.ts` (new file)
  - Implement `processMigration(userId: string)` with credit calculation (`/ 2.5`)
  - Implement error handling and transaction rollback
  - Add validation to prevent double-migration
  - **Ensure migration log is created on successful migration**
  - Verify: Service handles edge cases (zero credits, already migrated)

- [x] **1.6 Create migration API endpoint**
  - File: `backend/src/routes/user.routes.ts`
  - Add `POST /api/user/migrate` endpoint
  - Add authentication middleware
  - Call migration service and return new credit balance
  - Verify: Endpoint returns correct response format

- [x] **1.7 Update user profile API**
  - File: `backend/src/routes/user.routes.ts` or user controller
  - Ensure `GET /api/user/profile` includes `migration` field
  - Verify: Response contains migration status

### Phase 2: API Access Control

- [x] **2.1 Create migration middleware**
  - File: `backend/src/middleware/migration-check.ts` (new file)
  - Check user's migration status before processing API requests
  - Bypass check for admin users
  - Return 403 error with dashboard URL for non-migrated users
  - Verify: Middleware correctly blocks non-migrated users

- [x] **2.2 Apply migration middleware to LLM proxy endpoints**
  - File: `backend/src/routes/` or relevant proxy routes
  - Apply middleware to LLM API endpoints
  - Ensure middleware runs after authentication but before request processing
  - Verify: Non-migrated users receive 403 on API calls

### Phase 3: Frontend API Client

- [x] **3.1 Add migration API functions**
  - File: `frontend/src/lib/api.ts`
  - Add `migrateCredits()` function to call `POST /api/user/migrate`
  - Update `UserProfile` interface to include `migration: boolean`
  - Verify: Functions compile and type-check correctly

### Phase 4: Dashboard UI

- [x] **4.1 Create migration banner component**
  - File: `frontend/src/components/MigrationBanner.tsx` (new file)
  - Display rate change announcement (1000 → 2500 VNĐ/$)
  - Show two buttons: "Request Refund" and "Migrate Credits"
  - Add appropriate styling and responsiveness
  - Verify: Component renders correctly

- [x] **4.2 Create migration confirmation modal**
  - File: `frontend/src/components/MigrationBanner.tsx` (integrated)
  - Display current credits vs new credits calculation
  - Show warning about irreversible action
  - Add Confirm/Cancel buttons
  - Verify: Modal shows correct credit values

- [x] **4.3 Create migration success notification**
  - File: `frontend/src/components/MigrationBanner.tsx` (integrated)
  - Display success message after migration
  - Show updated credit balance
  - Add option to dismiss
  - Verify: Notification displays correctly

- [x] **4.4 Integrate migration UI into dashboard**
  - File: `frontend/src/app/(dashboard)/dashboard/page.tsx`
  - Check user's `migration` status on page load
  - Conditionally render migration banner if `migration === false`
  - Handle "Request Refund" button click (open Discord)
  - Handle "Migrate Credits" button click (show confirmation modal)
  - Update credit balance after successful migration
  - Remove migration UI after successful migration
  - Verify: Dashboard shows/hides migration UI based on status

### Phase 5: Translations

- [x] **5.1 Add Vietnamese translations**
  - File: `frontend/src/lib/i18n.ts`
  - Add migration-related keys: title, description, buttons, warnings, success messages
  - Verify: All UI strings have Vietnamese translations

- [x] **5.2 Add English translations**
  - File: `frontend/src/lib/i18n.ts`
  - Add English translations for all migration-related keys
  - Verify: All UI strings have English translations

### Phase 6: Testing & Validation

- [ ] **6.1 Test new user registration (auto-migrated)**
  - Register a new user
  - Verify `migration` is `true` by default
  - Verify dashboard does NOT show migration UI
  - Verify API access works immediately
  - **Verify NO migration log is created (new users don't migrate)**

- [ ] **6.2 Test existing user migration flow end-to-end**
  - Create test user with `migration: false` (simulating existing user)
  - Verify dashboard shows migration UI
  - Test migration API call
  - Verify credit balance updates correctly (`/ 2.5`)
  - Verify `migration` field set to `true`
  - **Verify migration log is created in `migration_logs` collection with correct data**
  - Verify migration UI disappears
  - Verify API access is now allowed

- [ ] **6.3 Test API blocking for non-migrated users**
  - Create test user with `migration: false`
  - Attempt LLM API call
  - Verify 403 error returned
  - Verify error message includes dashboard URL

- [ ] **6.4 Test admin bypass**
  - Create admin user with `migration: false`
  - Attempt LLM API call
  - Verify request succeeds (no 403 error)

- [ ] **6.5 Test double-migration prevention**
  - Create user with `migration: true`
  - Call migration API
  - Verify appropriate error returned
  - Verify credits not modified

- [ ] **6.6 Test refund button**
  - Click "Request Refund" button
  - Verify Discord opens in new tab
  - Verify current page remains active

- [ ] **6.7 Test edge cases**
  - Test with user having zero credits
  - Test with user having very large credits
  - Test with unauthenticated migration API call (expect 401)
  - Verify all cases handled correctly

- [ ] **6.8 Test migration log data integrity**
  - Query `migration_logs` collection after migration
  - Verify all required fields exist: userId, username, oldCredits, newCredits, migratedAt, oldRate, newRate
  - Verify oldCredits and newCredits are correct (newCredits = oldCredits / 2.5)
  - Verify migratedAt timestamp is accurate
  - Verify userId matches the migrated user
  - Verify oldRate is 1000 and newRate is 2500

## Dependencies

- Phase 1 must complete before Phase 2
- Phase 1 must complete before Phase 3
- Phase 3 must complete before Phase 4
- Phase 4 must complete before Phase 6
- Phase 5 can be done in parallel with Phase 4

## Rollout Notes

1. Deploy backend changes first (Phases 1-2)
2. Deploy frontend changes (Phases 3-4)
3. Monitor migration completion rate
4. After 3 days, run script to auto-migrate remaining users (separate task, not in scope)

## Validation

After completing all tasks:
- [ ] Run `openspec validate add-rate-migration-system --strict`
- [ ] Verify all tests pass
- [ ] Manual smoke test on staging environment
- [ ] Check migration blocking works as expected
