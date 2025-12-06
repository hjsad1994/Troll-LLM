# Change: Add Ref Credits Edit to Admin Users Page

## Why
Admin needs ability to manually set referral credits (`refCredits`) for users, similar to how they can already edit main credits. This allows admin to grant bonus referral credits or correct balances.

## What Changes
- Add `updateRefCredits` method to user repository
- Add `PATCH /admin/users/:username/refCredits` API endpoint
- Add `updateUserRefCredits` function to frontend API
- Add "Ref Credits" input field to Edit User modal in `/users` page

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `backend/src/repositories/user.repository.ts` - Add updateRefCredits method
  - `backend/src/routes/admin.routes.ts` - Add PATCH endpoint
  - `frontend/src/lib/api.ts` - Add updateUserRefCredits function
  - `frontend/src/app/(dashboard)/users/page.tsx` - Add Ref Credits section to edit modal
