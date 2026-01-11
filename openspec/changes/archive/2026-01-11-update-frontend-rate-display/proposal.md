# Proposal: Update Frontend Rate Display to 1500 VND/$1

## Problem

The frontend UI currently displays an outdated exchange rate of 2500 VND = $1 USD across all user-facing pricing interfaces. However, the backend has been updated to use the new rate of 1500 VND = $1 USD (defined in `backend/src/models/payment.model.ts` as `VND_RATE_NEW = 1500`).

This mismatch creates confusion for users who see incorrect pricing information:
- Pricing section shows: "2,500 VND = $1"
- Checkout page calculates amounts using VND_RATE = 2500
- Dashboard payment modal calculates amounts using VND_RATE = 2500

Users expect to see 1500 VND per dollar, but the UI misleads them with the old 2500 rate.

## Proposed Solution

Update all frontend components to reflect the correct 1500 VND/$1 rate and new purchase limits:

1. **Checkout Page** (`frontend/src/app/checkout/page.tsx`)
   - Change `VND_RATE` constant from 2500 to 1500 (line 14)
   - Change `MIN_AMOUNT` from 16 to 20 (line 12)
   - Update quick select buttons from [16, 50, 100] to [30, 40, 50, 60, 80] (line 260)
   - These amounts ensure all VND values are divisible by 1000 (no 500 fractions)

2. **Pricing Section** (`frontend/src/lib/i18n.ts`)
   - Update English rate string from "2,500 VND = $1" to "1,500 VND = $1" (line 106)
   - Update Vietnamese rate string from "2.500 VND = $1" to "1.500 VND = $1" (line 1474)
   - Update minimum purchase display from "$16" to "$20"

3. **Dashboard Payment Modal** (`frontend/src/components/DashboardPaymentModal.tsx`)
   - Change `VND_RATE` constant from 2500 to 1500 (line 17)
   - Change `MIN_AMOUNT` from 16 to 20 (line 15)
   - Update quick select buttons from [16, 50, 100] to [30, 40, 50, 60, 80] (line 312)
   - These amounts ensure all VND values are divisible by 1000 (no 500 fractions)

## Benefits

- **Accuracy**: Users see the correct, current exchange rate and updated purchase limits
- **Consistency**: Frontend matches backend pricing calculations
- **Better UX**: Round dollar amounts ($30, $40, $50, $60, $80) with clean VND values (all divisible by 1000)
- **Trust**: Eliminates confusion from rate mismatch
- **Simple**: Straightforward constant updates with no logic changes

## Implementation Approach

This is a simple configuration update requiring only constant changes in three locations. No new logic, API changes, or database migrations needed. The backend already uses the correct rate for all payment processing.

## Risks and Mitigation

**Risk**: Users might notice the rate change and question it
**Mitigation**: The rate is more favorable (cheaper) for users, so this is positive

**Risk**: None - this is a display-only update matching existing backend behavior

## Dependencies

None. This change is independent and can be implemented immediately.

## Related Changes

- Backend payment model already uses `VND_RATE_NEW = 1500`
- Backend payment service already calculates amounts with the new rate
- Previous dual-credit proposal was archived (not implemented)
