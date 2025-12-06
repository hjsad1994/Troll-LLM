# Change: Add Pro Troll Plan to Dashboard and Admin

## Why
Need to display Pro Troll plan badge on user dashboard and add Pro Troll support in admin users management (filter, edit plan).

## What Changes
- Dashboard: Display Pro Troll badge when user has pro-troll plan
- Users page: Add Pro Troll to plan filter options
- Users page: Allow admin to change user plan to Pro Troll
- Update UserPlan type to include 'pro-troll'

## Impact
- Affected specs: user-dashboard
- Affected code:
  - Frontend: `dashboard/page.tsx`, `users/page.tsx`, `lib/api.ts`
