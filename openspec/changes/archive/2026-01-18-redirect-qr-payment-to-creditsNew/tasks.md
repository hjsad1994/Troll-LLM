# Tasks: Redirect QR Payment to creditsNew

## Implementation Tasks

### 1. Update PaymentService.addCredits()
- [x] Modify `backend/src/services/payment.service.ts`
- [x] Change `user.credits` read to `user.creditsNew`
- [x] Change MongoDB `$inc: { credits }` to `$inc: { creditsNew }`
- [x] Change `expiresAt` to `expiresAtNew`
- [x] Change `purchasedAt` to `purchasedAtNew`
- [x] Update creditsBefore/creditsAfter to read from correct field

### 2. Verify UserKey Sync Logic
- [x] Review if UserKey sync needs to use different expiration field
- [x] Update to use `expiresAtNew` for UserKey expiration
- [x] Update tokensUsed to use `creditsNewUsed` instead of `creditsUsed`

### 3. Testing
- [ ] Manual test: Create checkout, verify QR generation
- [ ] Manual test: Simulate webhook, verify `creditsNew` incremented
- [ ] Manual test: Verify `expiresAtNew` set correctly
- [ ] Manual test: Verify Discord notification sent

### 4. Documentation
- [x] Update any relevant comments in code (logs updated)

## Verification Commands

```bash
# Check current payment service implementation
grep -n "creditsNew" backend/src/services/payment.service.ts

# Test checkout endpoint (manual)
curl -X POST http://localhost:3005/api/payment/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"credits": 20}'
```

## Rollback Plan

Nếu cần rollback, revert các thay đổi trong `payment.service.ts`:
- Đổi `creditsNew` về `credits`
- Đổi `expiresAtNew` về `expiresAt`
- Đổi `purchasedAtNew` về `purchasedAt`

## Changes Made

**File:** `backend/src/services/payment.service.ts` (lines 258-336)

**Summary of changes in `addCredits()` function:**
1. `user.credits` → `user.creditsNew` (line 268)
2. `$inc: { credits }` → `$inc: { creditsNew: credits }` (line 282)
3. `expiresAt` → `expiresAtNew` (lines 275, 281, 321, 327)
4. `purchasedAt` → `purchasedAtNew` (line 280)
5. `user.creditsUsed` → `user.creditsNewUsed` (line 317)
6. Updated log messages to reflect creditsNew system
