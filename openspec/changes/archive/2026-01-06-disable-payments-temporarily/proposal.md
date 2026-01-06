# Change: Temporarily Disable Payment Functionality

## Why
The user needs to temporarily disable payment functionality from the dashboard and checkout pages. This is a temporary measure and payments will be re-enabled later at the user's discretion.

## What Changes
- Disable "Buy Credits" button in dashboard (`/dashboard`)
- Disable checkout page (`/checkout`)
- Add a maintenance/disabled notice when users attempt to access payment features
- Keep backend payment routes functional (no backend changes needed)
- No database changes required

## Impact
- Affected specs: billing (frontend capability)
- Affected code:
  - `frontend/src/app/(dashboard)/dashboard/page.tsx:594-602` - Buy Credits button
  - `frontend/src/app/checkout/page.tsx` - Entire checkout page
  - `frontend/src/components/DashboardPaymentModal.tsx` - Payment modal (called from dashboard)
- User experience: Users will see a disabled notice instead of payment options
- Reversibility: Easy to re-enable by removing the disabled flag
