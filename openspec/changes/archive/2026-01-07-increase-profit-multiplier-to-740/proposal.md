# Change: Increase Profit Multiplier to 740 VND per $1

## Why

The current profit multiplier for billing calculations is 665 VND per $1 (based on selling price of 2500 VND minus cost of 1835 VND). To increase the platform's profit margin for the admin billing dashboard, the profit multiplier needs to be updated to 740 VND per $1.

This is a simple configuration change that affects how total profit is calculated and displayed on the `/admin/billing` page.

## What Changes

- **Update profit multiplier constant** from 665 to 740 VND per $1
  - Update `PROFIT_VND_PER_USD` constant in `backend/src/models/payment.model.ts`
  - Update comments and documentation referencing the profit calculation
- **Profit calculation change**
  - Previous formula: `profit = credits * 665`
  - New formula: `profit = credits * 740`
  - This affects both per-payment profit and total profit aggregation

## Impact

- **Affected specs:** `billing`
- **Affected code:**
  - `backend/src/models/payment.model.ts` (constant value and comments)
- **No frontend changes needed** - the API response structure remains the same, only the calculated values change
- **No database changes** - profit is calculated on-the-fly in aggregations

## Key Constraints

- Current profit: **665 VND per $1** (2500 - 1835 = 665)
- New profit: **740 VND per $1** (requested by admin)
- Selling price to users remains **2500 VND per $1** (unchanged)
- Profit only calculated for payments completed on or after **2026-01-06 20:49:00** (VN timezone, UTC+7)
- This is a display/analytics change only - no changes to payment processing or user-facing functionality
