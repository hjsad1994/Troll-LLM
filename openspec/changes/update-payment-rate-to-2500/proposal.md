# Change: Update Payment Rate from 1000 to 2500 VND/USD

## Why

The current payment rate of 1,000 VND = $1 USD needs to be updated to 2,500 VND = $1 USD to align with current market conditions and business requirements. This change affects all payment calculations, QR code generation, and UI displays across the platform.

## What Changes

- **BREAKING**: Update VND_RATE constant from 1000 to 2500 in backend payment model
- **BREAKING**: Update VND_RATE constant from 1000 to 2500 in frontend checkout page
- Update pricing displays on checkout page to reflect new rate (20-100 USD now equals 50,000-250,000 VND)
- Update pricing displays on pricing page subscription plans (currently showing 35K, 79K - these need to be recalculated based on new rate)
- Update payment configuration API to return new rate
- Update all UI labels showing VND amounts to reflect new calculations

## Impact

- Affected specs: payment (new capability to be created)
- Affected code:
  - `backend/src/models/payment.model.ts:10` - VND_RATE constant
  - `backend/src/routes/payment.routes.ts:128-136` - payment config endpoint
  - `frontend/src/app/checkout/page.tsx:14` - VND_RATE constant
  - `frontend/src/app/docs/pricing/page.tsx:153-180` - subscription plan prices (lines 156, 169)
  - `frontend/src/app/(dashboard)/dashboard/page.tsx` - any displays of payment amounts

## Migration Notes

- The existing migration system for user credits (migration from 1000 to 2500 rate) has already been implemented
- New users already have `migration: true` by default
- This change completes the rate update by updating all frontend and backend constants
- Payment QR codes will automatically use the new rate after this change
- No database migration needed as the rate is a constant, not stored per-payment
