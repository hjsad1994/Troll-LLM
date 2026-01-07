# Tasks

## Backend Changes

1. ~~**Update profit multiplier constant in payment model**~~
   - ~~Change `PROFIT_VND_PER_USD` from 665 to 740 in `backend/src/models/payment.model.ts`~~ ✅
   - ~~Update comment to reflect new profit calculation~~ ✅
   - ~~Verify the change affects all profit calculations in aggregation queries~~ ✅

## Validation

2. ~~**Verify profit calculations**~~
   - ~~Test admin billing dashboard with sample payments~~ ✅
   - ~~Verify per-payment profit displays correctly (credits × 740)~~ ✅
   - ~~Verify total profit aggregation is accurate~~ ✅
   - ~~Confirm payments before cutoff date still show 0 profit~~ ✅

## Summary

All tasks completed successfully:
- Updated `PROFIT_VND_PER_USD` constant from 665 to 740 in `backend/src/models/payment.model.ts`
- Updated comments in both `payment.model.ts` and `payment.repository.ts` to reflect the new value
- Verified all profit calculations use the imported constant, ensuring consistency across the codebase
- Profit calculations now use 740 VND per $1 for all eligible payments (completed after 2026-01-06 20:49:00 VN timezone)
