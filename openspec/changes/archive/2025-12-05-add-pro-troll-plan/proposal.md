# Change: Add Pro Troll Plan and Update RPM Limits

## Why
Need to add a new "Pro Troll" subscription tier with 180K VND price and 1250 credits, and update RPM (requests per minute) limits across all plans to: Dev=150, Pro=300, Pro Troll=600.

## What Changes
- Add "pro-troll" as new PaymentPlan type in backend
- Update PLAN_PRICES to include pro-troll: 180000 VND, 1250 credits
- Update checkout page to support pro-troll plan selection
- Update RPM limits: Dev=150, Pro=300, Pro Troll=600
- Add i18n translations for Pro Troll plan in checkout

## Impact
- Affected specs: payment
- Affected code:
  - Backend: `payment.model.ts`, `payment.service.ts`
  - Frontend: `checkout/page.tsx`, `lib/i18n.ts`
