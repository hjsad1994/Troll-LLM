# Change: Add Profit Tracking to Admin Billing Dashboard

## Why

The current billing dashboard at `/admin/billing` displays total revenue (VND amount) from successful payments but does not show the actual profit earned by the platform. Administrators need better visibility into profits: selling price is 2500 VND per $1 credits, cost is 1835 VND per $1, so profit is 665 VND per $1 credits.

The profit calculation must only apply to payments completed on or after January 6, 2026 at 20:49 (Vietnam timezone), as this is when the new pricing policy took effect.

## What Changes

- **Add profit tracking to admin billing dashboard** (`/admin/billing`)
  - New "Profit" column in payments table showing calculated profit in VND
  - New "Total Profit" stat card showing aggregated profit for filtered period
  - Profit calculated as: `credits * 665` where credits are in USD (profit = selling price - cost)
- **Backend changes**
  - Update payment stats aggregation to include profit calculation
  - Add `profitVND` field to payment API response
  - Only calculate profit for payments with `completedAt >= 2026-01-06 20:49:00` (VN timezone)
  - For payments before this date, profit returns 0
- **Frontend changes**
  - Add "Profit" column to payments table in `frontend/src/app/(dashboard)/admin/billing/page.tsx`
  - Add "Total Profit" stat card alongside existing stats
  - Format profit values as VND currency

## Impact

- **Affected specs:** `billing`
- **Affected code:**
  - `backend/src/repositories/payment.repository.ts` (profit calculation in aggregation)
  - `backend/src/routes/admin.routes.ts` (API response structure)
  - `frontend/src/app/(dashboard)/admin/billing/page.tsx` (UI updates)

## Key Constraints

- Selling price: **2500 VND per $1** (what users pay - unchanged)
- Cost: **1835 VND per $1** (your cost for credits)
- Profit: **665 VND per $1** (2500 - 1835 = 665)
- Profit formula: `profit = credits * 665`
- Profit only calculated for payments completed on or after **2026-01-06 20:49:00** (VN timezone, UTC+7)
- For payments before this cutoff, profit displays as 0 VND
- This is a display/analytics feature only - no changes to payment processing or user-facing functionality
