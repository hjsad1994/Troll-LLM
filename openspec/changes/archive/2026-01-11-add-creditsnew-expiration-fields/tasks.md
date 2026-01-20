# Tasks: Add Separate Expiration Fields for creditsNew

## Phase 1: Database Schema Update

- [x] **1.1** Update `IUserNew` interface in `user-new.model.ts`
  - Add `purchasedAtNew?: Date | null`
  - Add `expiresAtNew?: Date | null`

- [x] **1.2** Update `userNewSchema` in `user-new.model.ts`
  - Add `purchasedAtNew: { type: Date, default: null }`
  - Add `expiresAtNew: { type: Date, default: null }`

## Phase 2: Payment Service Update

- [x] **2.1** Update `addCredits()` method in `payment.service.ts`
  - Change from setting `purchasedAt`/`expiresAt` to `purchasedAtNew`/`expiresAtNew`
  - Schedule expiration for creditsNew separately using `scheduleExpirationNew()`

## Phase 3: Expiration Scheduler Update

- [x] **3.1** Update `ExpirationSchedulerService.init()`
  - Query users with `creditsNew > 0` and `expiresAtNew` set
  - Schedule expiration separately from credits cũ

- [x] **3.2** Add `scheduleExpirationNew()` method for creditsNew
  - Similar to `scheduleExpiration()` but for creditsNew
  - Uses separate `scheduledExpirationsNew` map

- [x] **3.3** Add `resetAndLogNew()` method
  - Reset `creditsNew` to 0
  - Clear `purchasedAtNew` and `expiresAtNew`
  - Log the reset action with `[creditsNew]` note

- [x] **3.4** Update cleanup methods
  - `cleanupExpiredZeroCredits()` now handles both credits and creditsNew

## Phase 4: Service Layer Update

- [x] **4.1** Update `UserProfile` interface in `user.service.ts`
  - Add `purchasedAtNew: Date | null`
  - Add `expiresAtNew: Date | null`

- [x] **4.2** Update `BillingInfo` interface
  - Add `purchasedAtNew: Date | null`
  - Add `expiresAtNew: Date | null`
  - Add `daysUntilExpirationNew: number | null`
  - Add `isExpiringSoonNew: boolean`

- [x] **4.3** Update `getProfile()` method
  - Return new fields `purchasedAtNew` and `expiresAtNew`

- [x] **4.4** Update `getBillingInfo()` method
  - Calculate days until expiration for creditsNew
  - Return new expiration info

## Phase 5: API Routes Update

- [x] **5.1** Admin routes - No changes needed
  - Existing endpoints already return full user data

## Phase 6: Frontend Update

- [x] **6.1** Update `api.ts` TypeScript interfaces
  - Add new fields to `UserProfile` and `BillingInfo`

- [x] **6.2** Update Dashboard to show creditsNew expiration
  - Display `expiresAtNew` countdown/date in violet theme
  - Show warning if expiring soon (isExpiringSoonNew)
  - Added "Standard Credits Validity" section

## Phase 7: Testing & Validation

- [ ] **7.1** Test payment flow
  - Verify creditsNew gets correct expiration

- [ ] **7.2** Test expiration scheduler
  - Verify creditsNew expires independently

- [ ] **7.3** Test dashboard display
  - Verify new fields are displayed correctly

## Completion Notes

All implementation tasks completed. The system now has:
- Separate expiration fields for creditsNew (`purchasedAtNew`, `expiresAtNew`)
- Independent scheduling and reset logic for both credit types
- Frontend displays separate validity sections for each credit type
- Backward compatible - existing `purchasedAt`/`expiresAt` for OhMyGPT credits unchanged
