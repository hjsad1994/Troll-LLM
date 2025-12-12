# Change: Add Users Table Sorting and Last Login Column

## Why
Admin users need to sort the users table by key financial metrics (credits, burned, expires) and track user activity via last login time to better manage and monitor user accounts.

## What Changes
- Add sortable columns for Credits, Burned, and Expires in the admin users table
- Add a new "Last Login" column showing when each user last logged in
- Implement client-side sorting with visual indicators for sort direction
- Update both desktop table and mobile card views

## Impact
- Affected specs: `specs/admin-dashboard/spec.md`
- Affected code:
  - `frontend/src/app/(dashboard)/users/page.tsx` - Add sorting logic and Last Login column
  - `frontend/src/components/LanguageProvider.tsx` - Add translation keys for Last Login
