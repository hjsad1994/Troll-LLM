## 1. Backend Implementation

- [x] 1.1 Define profit calculation constants in payment model
  - Add `PROFIT_VND_PER_USD = 665` constant (profit = 2500 - 1835)
  - Add `PROFIT_CUTOFF_DATE = '2026-01-06T20:49:00+07:00'` constant (VN timezone)

- [x] 1.2 Update `PaymentRepository.getPaymentStats()` method
  - Add profit aggregation pipeline stage
  - Calculate profit as: `credits * 665` for eligible payments (profit per $1 sold)
  - Return `totalProfit` field in stats response

- [x] 1.3 Update `PaymentRepository.getAllPayments()` method
  - Add profit calculation to each payment document
  - Use MongoDB aggregation `$addFields` or calculate in application layer
  - Include `profitVND` field for each payment (0 for ineligible payments)

- [x] 1.4 Update admin API route response
  - Modify `/admin/payments` route in `backend/src/routes/admin.routes.ts`
  - Include `profitVND` field in each payment object
  - Include `totalProfit` in stats response

- [x] 1.5 Test profit calculation logic
  - Verify calculation: profit = credits * 665 (where 665 = 2500 - 1835)
  - Verify cutoff date handling (VN timezone UTC+7)
  - Test edge cases: payments before/after cutoff, pending/failed payments

## 2. Frontend Implementation

- [x] 2.1 Update TypeScript interfaces
  - Add `profitVND?: number` to `Payment` interface in `frontend/src/app/(dashboard)/admin/billing/page.tsx`
  - Add `totalProfit?: number` to `PaymentStats` interface

- [x] 2.2 Add "Profit" column to payments table
  - Add new `<th>` header for "Profit" in table header row
  - Add new `<td>` cell for profit data in table body
  - Format profit values using existing `formatCurrency()` function
  - Display "-" for 0 or undefined profit values

- [x] 2.3 Add "Total Profit" stat card
  - Add new stat card component in stats section
  - Display using same styling as existing stat cards
  - Show aggregated profit from `stats.totalProfit`
  - Use appropriate color (e.g., emerald/green for positive profit)

- [x] 2.4 Verify responsive layout
  - Ensure table handles new column on mobile devices
  - Test horizontal scrolling on smaller screens
  - Verify stat cards grid layout with additional card

## 3. Validation & Testing

- [ ] 3.1 Manual testing with sample data
  - Create test payments before and after cutoff date
  - Verify profit calculations match expected formula
  - Check stat totals aggregate correctly

- [ ] 3.2 Edge case testing
  - Test payment exactly at cutoff time (`2026-01-06 20:49:00`)
  - Test payments with different statuses (pending, failed, expired)
  - Test profit display with various credit amounts (16-100 USD)

- [ ] 3.3 Timezone verification
  - Confirm cutoff date uses Vietnam timezone (UTC+7)
  - Test with payments created in different timezones
  - Verify database stores completedAt in correct timezone

## 4. Documentation

- [x] 4.1 Update comments in payment repository
  - Document profit calculation formula
  - Note cutoff date and timezone requirements
  - Explain exchange rate change context

- [ ] 4.2 Verify no breaking changes
  - Confirm existing API fields unchanged
  - Ensure backward compatibility with existing clients
  - Test that old payment records still display correctly
