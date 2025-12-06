## 1. Backend Implementation
- [x] 1.1 Update PaymentPlan type to include 'pro-troll'
- [x] 1.2 Update PLAN_PRICES with pro-troll: 180000 VND, 1250 credits, 600 RPM
- [x] 1.3 Update payment schema enum to include 'pro-troll'
- [x] 1.4 Update generateOrderCode to handle pro-troll

## 2. Frontend Implementation
- [x] 2.1 Add pro-troll to PLANS object in checkout page
- [x] 2.2 Update PlanType to include 'pro-troll'
- [x] 2.3 Update RPM values: Dev=150, Pro=300, Pro Troll=600
- [x] 2.4 Add i18n translations for Pro Troll checkout (EN/VI)
- [x] 2.5 Update plan selection UI for 3 plans
- [x] 2.6 Update createCheckout API signature

## 3. Testing
- [x] 3.1 Run TypeScript type check (BE + FE passed)
- [ ] 3.2 Verify checkout flow works with new plan
