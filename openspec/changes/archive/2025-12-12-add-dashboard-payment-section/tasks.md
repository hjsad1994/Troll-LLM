## 1. Frontend - Dashboard Payment Section

- [ ] 1.1 Add "Buy Credits" button to Billing Card section in `/dashboard/page.tsx`
- [ ] 1.2 Add state management for payment modal (isOpen, selectedAmount)
- [ ] 1.3 Integrate existing `PaymentModal` component or create `DashboardPaymentModal`
- [ ] 1.4 Add payment amount selection UI ($20, $50, $100 options with VND conversion)

## 2. Frontend - Payment Modal Integration

- [ ] 2.1 Adapt `PaymentModal` component to work with dashboard context
- [ ] 2.2 Add QR code display after amount selection
- [ ] 2.3 Implement 15-minute countdown timer
- [ ] 2.4 Add payment status polling (every 3 seconds)
- [ ] 2.5 Handle success state with credits refresh
- [ ] 2.6 Handle expiration state with retry option

## 3. Frontend - Payment History Display

- [ ] 3.1 Create `RecentPayments` component for dashboard
- [ ] 3.2 Call `getPaymentHistory()` API on dashboard load
- [ ] 3.3 Display last 5 payments with date, amount, status
- [ ] 3.4 Add status badges (success=green, pending=yellow, expired=red)
- [ ] 3.5 Add "View All" link to payment history page
- [ ] 3.6 Handle empty state with prompt to buy credits

## 4. Frontend - Credits Auto-Refresh

- [ ] 4.1 Add callback from PaymentModal to refresh billing data
- [ ] 4.2 Update credits display immediately after successful payment
- [ ] 4.3 Add optimistic UI update or loading state

## 5. Testing

- [ ] 5.1 Frontend builds without errors (`npm run build`)
- [ ] 5.2 ESLint passes without errors (`npm run lint`)
- [ ] 5.3 Manual test: Buy Credits button opens modal
- [ ] 5.4 Manual test: Amount selection generates QR code
- [ ] 5.5 Manual test: Payment success updates credits
- [ ] 5.6 Manual test: Payment history displays correctly
