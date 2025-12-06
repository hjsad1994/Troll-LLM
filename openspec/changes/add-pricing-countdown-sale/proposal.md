# Change: Add Countdown Sale Timer to Pricing Page

## Why
The pricing page currently shows discounted prices but lacks urgency. Adding a countdown timer that shows the sale ending in 7 days will create urgency and encourage conversions.

## What Changes
- Add a countdown timer component showing days, hours, minutes, seconds until sale ends
- Sale end date is calculated as 7 days from a fixed start date
- Display countdown prominently on the pricing page above subscription plans
- Add i18n translations for countdown labels

## Impact
- Affected specs: frontend-i18n
- Affected code: `frontend/src/app/docs/pricing/page.tsx`, `frontend/src/lib/i18n.ts`
