## Context

The TrollLLM billing dashboard currently tracks revenue (total VND amount received from payments) but does not calculate or display the actual profit earned by the platform. The pricing model is:
- **Selling price**: 2500 VND per $1 credits (what users pay)
- **Cost**: 1835 VND per $1 credits (your cost for credits)
- **Profit**: 665 VND per $1 credits (2500 - 1835 = 665)

Administrators need visibility into:
1. Individual payment profit (665 VND × $1 credits sold)
2. Total profit aggregated across any time period
3. Clear distinction: only payments from 2026-01-06 20:49 onwards show profit

## Goals / Non-Goals

**Goals:**
- Add profit calculation to admin billing dashboard (`/admin/billing`)
- Display profit per payment in the payments table
- Show aggregated total profit in stat cards
- Only calculate profit for payments on or after the policy change date
- Use fixed profit rate: 665 VND per $1 credits sold

**Non-Goals:**
- Changing user-facing pricing or payment flows (still 2500 VND/$1)
- Modifying payment processing logic
- Storing profit values in the database (calculated on-demand)
- Changing how old payments (pre-cutoff) are displayed

## Decisions

### Decision 1: Calculate profit on-demand vs store in database

**Choice:** Calculate profit on-demand in the application/backend layer.

**Rationale:**
- Profit is a derived metric based on credits (already stored)
- Allows profit calculation logic to be updated if profit rate changes
- Avoids database migration for existing payments
- Profit calculation is lightweight: `credits * 665`

**Alternatives considered:**
- **Store profit in database:** Would require migration and updates if formula changes. Rejected for unnecessary complexity.
- **Calculate in frontend only:** Would duplicate logic, harder to maintain, client could manipulate display. Rejected for data integrity.

### Decision 2: Profit cutoff date handling

**Choice:** Use Vietnam timezone (UTC+7) for cutoff date comparison: `2026-01-06 20:49:00+07:00`

**Rationale:**
- Business context is Vietnam-based (SePay integration, VND currency)
- Matches the time when the pricing policy was actually changed
- MongoDB stores dates in UTC, but we convert to VN timezone for comparison

**Implementation approach:**
```javascript
const CUTOFF_DATE = new Date('2026-01-06T20:49:00+07:00');
// MongoDB aggregation filter
{
  $cond: {
    if: { $gte: ['$completedAt', CUTOFF_DATE] },
    then: { $multiply: ['$credits', 665] },
    else: 0
  }
}
```

### Decision 3: Profit rate (665 VND per $1 credits sold)

**Choice:** Use constant `PROFIT_VND_PER_USD = 665` for all profit calculations.

**Rationale:**
- This is the fixed profit earned per $1 credits sold
- Selling price: 2500 VND/$1 (user pricing, unchanged)
- Cost: 1835 VND/$1 (your cost)
- Profit = 2500 - 1835 = 665 VND per $1

**Formula:**
```
profitVND = payment.credits * 665
```

Example:
- User buys $20 credits
- User pays: 20 × 2500 = 50,000 VND (selling price)
- Your cost: 20 × 1835 = 36,700 VND
- Your profit: 20 × 665 = 13,300 VND

### Decision 4: Backend vs frontend calculation

**Choice:** Calculate profit in backend (MongoDB aggregation + repository layer).

**Rationale:**
- Single source of truth for calculation logic
- API returns profit values ready for display
- Easier to test backend logic in isolation
- Frontend only formats and displays, no math errors possible

**Implementation:**
- MongoDB aggregation pipeline for efficient calculation
- Application-layer fallback if aggregation is complex
- Frontend receives `profitVND` integer field in API response

## Risks / Trade-offs

### Risk 1: Timezone confusion between MongoDB storage and VN timezone

**Mitigation:**
- Store cutoff date as ISO-8601 string with explicit timezone: `2026-01-06T20:49:00+07:00`
- Add comments explaining timezone handling in code
- Test with payments created at various times around the cutoff

### Risk 2: Profit rate changes in future

**Mitigation:**
- Use constant `PROFIT_VND_PER_USD = 665` for easy updates
- Consider adding `rateEffectiveDate` field if multiple profit periods needed
- Document in code comments where the rate comes from (665 = 2500 - 1835)

### Risk 3: Performance impact on large payment datasets

**Mitigation:**
- Aggregation pipeline is efficient (single pass, simple multiplication)
- Only admin endpoint (low traffic compared to user endpoints)
- Pagination limits result set size (20 items per page)
- Consider adding index on `completedAt` if queries become slow

## Migration Plan

**No database migration required** - profit is calculated on-demand.

**Deployment steps:**
1. Deploy backend changes (repository + routes)
2. Deploy frontend changes (UI updates)
3. Verify profit calculations in staging/production
4. Monitor for any calculation errors

**Rollback:**
- Remove `profitVND` field from API responses
- Remove profit column from frontend table
- No database rollback needed (no schema changes)

## Open Questions

1. **Q:** Should profit be displayed for failed/pending payments?
   **A:** No, only successful payments (`status === 'success'`) have profit calculated.

2. **Q:** What if the profit rate changes again in the future?
   **A:** Update the `PROFIT_VND_PER_USD` constant and consider adding `rateEffectiveDate` to support multiple rate periods.

3. **Q:** Should we show profit margin percentage?
   **A:** Not in this change. Could add later as: `(profit / revenue) * 100` = (665 / 2500) × 100 = 26.6%.

4. **Q:** How do we handle payments exactly at the cutoff time?
   **A:** Use `>=` comparison, so payments at `2026-01-06 20:49:00` exactly ARE included in profit calculation.
