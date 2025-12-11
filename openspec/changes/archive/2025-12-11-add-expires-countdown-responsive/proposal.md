# Change: Add Expires Countdown Display and Mobile Responsive Support

## Why
Currently the Admin Users page only shows "Xd" remaining days format which lacks context about the total subscription period. Users need to see both remaining days and total days (e.g., "6/7") to understand subscription status at a glance. Additionally, the Users table is not optimized for mobile viewing.

## What Changes
- Update the Expires column in Admin Users table to display X/Y format (e.g., "6/7" meaning 6 days remaining out of 7 days total)
- Add expires countdown display to User Dashboard billing section with the same X/Y format
- Make the Admin Users table responsive for mobile devices using card-based layout
- Add visual indicators for expiring soon (< 3 days) and expired status

## Impact
- Affected specs: admin-dashboard, user-dashboard
- Affected code:
  - `frontend/src/app/(dashboard)/users/page.tsx` - Admin users table and responsive layout
  - `frontend/src/app/(dashboard)/dashboard/page.tsx` - User dashboard billing section
  - `frontend/src/lib/api.ts` - May need to expose subscription period info
  - `backend/src/models/user.model.ts` - Subscription period is already defined (7 days for both packages)
