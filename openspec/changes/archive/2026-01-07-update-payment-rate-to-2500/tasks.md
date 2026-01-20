## 1. Backend Updates

- [x] 1.1 Update `VND_RATE` constant in `backend/src/models/payment.model.ts` from 1000 to 2500
- [x] 1.2 Verify `backend/src/routes/payment.routes.ts` payment config endpoint returns the correct rate (should use the constant from payment.model.ts)

## 2. Frontend Checkout Page Updates

- [x] 2.1 Update `VND_RATE` constant in `frontend/src/app/checkout/page.tsx` from 1000 to 2500
- [x] 2.2 Verify all VND amount displays on checkout page show correct values:
  - [x] 2.2.1 Quick select buttons ($20 = 50,000 VND, $50 = 125,000 VND, $100 = 250,000 VND)
  - [x] 2.2.2 Slider min/max labels (50,000 VND - 250,000 VND)
  - [x] 2.2.3 Payment summary and QR code amount display
  - [x] 2.2.4 Success page payment confirmation

## 3. Pricing Page Updates

- [x] 3.1 Review and update subscription plan prices in `frontend/src/app/docs/pricing/page.tsx` if they reference specific VND amounts
- [x] 3.2 Add note or tooltip explaining the 2500 VND = $1 USD rate for clarity
- [x] 3.3 Ensure any pricing examples or calculations use the correct rate

## 4. Dashboard Updates

- [x] 4.1 Review `frontend/src/app/(dashboard)/dashboard/page.tsx` for any hardcoded VND amounts
- [x] 4.2 Verify payment modal or "Buy Credits" flow displays correct VND amounts
- [x] 4.3 Check payment history display shows correct VND amounts (should read from API which uses backend rate)

## 5. Testing & Validation

- [ ] 5.1 Test checkout flow with different amounts ($20, $50, $100)
- [ ] 5.2 Verify QR code amounts are correct for selected USD values
- [ ] 5.3 Test payment config API returns `vndRate: 2500`
- [ ] 5.4 Verify pricing page displays are accurate
- [ ] 5.5 Test dashboard credit purchase flow
- [ ] 5.6 Verify payment history shows correct VND amounts

## 6. Documentation

- [x] 6.1 Update any inline comments referencing the old 1000 rate
- [ ] 6.2 Verify project documentation reflects current payment rate if mentioned

## Additional Changes Made

- [x] Updated `VND_RATE` constant in `frontend/src/components/DashboardPaymentModal.tsx` from 1000 to 2500
- [x] Updated hardcoded `* 1000` calculations to `* VND_RATE` in DashboardPaymentModal (lines 278, 369)
- [x] Updated comment in `backend/src/scripts/convert-usernew-credits.ts` to clarify old rate vs new rate
