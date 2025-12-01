# Change: Add Plan Start Date and Expiration Display to Dashboard

## Why
Users need visibility into when their plan started and when it will expire to manage their subscriptions effectively. Currently, the dashboard only shows expiration date in a small text, but does not display the plan start date at all.

## What Changes
- Add a dedicated "Plan Period" section in the Credits Card showing:
  - Plan Start Date (`planStartDate`)
  - Plan Expiration Date (`planExpiresAt`)
  - Days remaining until expiration
- Improve visual hierarchy for plan dates display
- Show dates in a more prominent location for paid plan users

## Impact
- Affected specs: `user-dashboard`
- Affected code: `frontend/src/app/(dashboard)/dashboard/page.tsx`
