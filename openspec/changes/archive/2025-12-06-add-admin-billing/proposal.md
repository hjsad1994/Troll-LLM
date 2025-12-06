# Change: Add Admin Billing Dashboard

## Why
Admins need to view recent user payment/order history to monitor revenue and troubleshoot payment issues. Currently there is no admin interface to see all payments made by users.

## What Changes
- Add "Billing" navigation item to admin sidebar in `frontend/src/components/Sidebar.tsx`
- Create new admin API endpoint `GET /api/admin/payments` to fetch all payments with pagination
- Create new frontend page `/admin/billing` to display payment orders in a table

## Impact
- Affected specs: admin-dashboard (new capability)
- Affected code:
  - `frontend/src/components/Sidebar.tsx` - Add billing nav item
  - `backend/src/routes/admin.routes.ts` - Add payments endpoint
  - `frontend/src/app/(dashboard)/admin/billing/page.tsx` - New page
