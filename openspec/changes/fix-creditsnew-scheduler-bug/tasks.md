## 1. Implementation

- [ ] 1.1 Fix scheduler function call in `payment.service.ts:335`
  - Change `scheduleExpiration()` to `scheduleExpirationNew()`
  - File: `backend/src/services/payment.service.ts`

## 2. Verification

- [ ] 2.1 Test payment flow
  - Make a test payment
  - Verify `scheduleExpirationNew()` is called in logs
  - Verify timer is registered in `scheduledExpirationsNew` map

- [ ] 2.2 Verify existing users
  - Restart backend to trigger `init()`
  - Check logs for correct scheduling of existing creditsNew users
