# Change: Add RefCredits Column to Admin Users Table

## Why
Admin users need visibility into referral credits (`refCredits`) for each user to better manage and support the referral program. Currently, only main credits are displayed in the `/users` admin page.

## What Changes
- Add "Ref Credits" column to the admin users table at `/users`
- Display `refCredits` value for each user with appropriate formatting (e.g., $X.XX)
- Include `refCredits` in the mobile card view for consistency

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `frontend/src/app/(dashboard)/users/page.tsx` - Add column to table and mobile cards
  - `frontend/src/lib/api.ts` - Ensure `AdminUser` interface includes `refCredits`
