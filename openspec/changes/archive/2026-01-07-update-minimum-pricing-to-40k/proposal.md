# Update Minimum Pricing Display to 40,000 VND

## Summary

Update the pricing page to display **40.000 VND** as the minimum purchase amount instead of the current **20.000 VND**. This is a **UI-only change** to align the displayed minimum with the actual minimum purchase requirement.

## Context

Currently, the pricing page at `/#pricing` displays:
- `20.000VND tối thiểu` (20,000 VND minimum)

However, the actual minimum purchase amount in the system is **$16 USD**, which at the current VND rate of **2.500 VND = $1** equals **40.000 VND** (16 × 2500 = 40.000).

This creates a discrepancy where the landing page shows 20.000 VND but the actual minimum checkout amount is 40.000 VND.

## Change Scope

**This is a frontend-only display update.** The backend already correctly enforces the minimum purchase amount of $16 (40,000 VND).

### Files to Update

1. **`frontend/src/app/page.tsx`** (line ~450)
   - Change: `20.000` → `40.000`
   - Current: `<span className="text-5xl sm:text-6xl font-bold text-[var(--theme-text)]">20.000</span>`
   - New: `<span className="text-5xl sm:text-6xl font-bold text-[var(--theme-text)]">40.000</span>`

2. **`frontend/src/lib/i18n.ts`** (optional, for consistency)
   - The `minPurchase` text already states `$16` which is correct
   - Consider updating related copy if needed

### No Backend Changes Required

The backend constants are already correct:
- `MIN_CREDITS = 16` (in `backend/src/models/payment.model.ts`)
- `VND_RATE = 2500`
- Checkout validation already enforces minimum of $16

## Validation

After applying this change:
1. The pricing page should display `40.000VND tối thiểu`
2. Clicking "Buy Credits" should allow minimum purchase of $16 (40,000 VND)
3. No backend validation errors should occur
4. The displayed minimum matches the actual checkout minimum

## Related Changes

- Related to: `update-payment-rate-to-2500` (which set VND rate to 2500)
- Related to: `update-ohmygpt-pricing` (ongoing pricing updates)

## Risk Assessment

**Low Risk**
- Pure UI text change
- No logic modifications
- No database migrations
- No API changes
- Backend validation remains unchanged

## Open Questions

None - this is a straightforward display update.
