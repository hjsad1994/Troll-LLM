# Implementation Tasks

## 1. Backend - User Model Updates
- [ ] 1.1 Add `referralCode` field to User model (unique, auto-generated, 8 chars)
- [ ] 1.2 Add `referredBy` field to User model (userId of referrer)
- [ ] 1.3 Add `refCredits` field to User model (separate referral credits balance, default 0)
- [ ] 1.4 Create migration/script to generate referralCode for existing users

## 2. Backend - Registration Updates
- [ ] 2.1 Accept optional `ref` query parameter during registration
- [ ] 2.2 Validate referral code exists
- [ ] 2.3 Store `referredBy` relationship when valid ref code provided

## 3. Backend - Payment Service Updates
- [ ] 3.1 Add referral credits logic to payment success handler
- [ ] 3.2 Award 25 refCredits to both users for Dev plan
- [ ] 3.3 Award 50 refCredits to both users for Pro plan
- [ ] 3.4 Create referral bonus transaction records

## 4. Backend - Referral API
- [ ] 4.1 Create `GET /api/user/referral` - Get user's referral code and link
- [ ] 4.2 Create `GET /api/user/referral/stats` - Get referral statistics
- [ ] 4.3 Create `GET /api/user/referral/list` - Get list of referred users (masked username, status, plan, bonus, date)

## 5. GoProxy - Credit Deduction Logic
- [ ] 5.1 Update credit deduction to check main credits first
- [ ] 5.2 If main credits exhausted, deduct from refCredits
- [ ] 5.3 When using refCredits, apply Pro-level RPM (1000 RPM)
- [ ] 5.4 Handle partial credits scenario (main + refCredits combined)

## 6. Frontend - Registration
- [ ] 6.1 Parse `ref` query parameter from URL
- [ ] 6.2 Store ref code and include in registration request

## 7. Frontend - Referral Page
- [ ] 7.1 Create new page `/dashboard/referral`
- [ ] 7.2 Add "Referral" menu item to dashboard sidebar (with icon)
- [ ] 7.3 Display user's referral link with copy-to-clipboard button
- [ ] 7.4 Show referral statistics cards:
  - Total referrals (registered)
  - Successful referrals (paid)
  - Total refCredits earned
  - Current refCredits balance
- [ ] 7.5 Display list/table of referred users with columns:
  - Username (masked: abc***xyz)
  - Status (Registered / Paid)
  - Plan purchased (if paid)
  - Bonus earned
  - Date

## 8. Frontend - Dashboard Updates
- [ ] 8.1 Show refCredits balance in dashboard header/sidebar
- [ ] 8.2 Differentiate refCredits from main credits in UI

## 9. Testing
- [ ] 9.1 Test registration with valid referral code
- [ ] 9.2 Test registration with invalid referral code
- [ ] 9.3 Test refCredits awarded on payment completion
- [ ] 9.4 Test credit deduction priority (main credits first)
- [ ] 9.5 Test Pro-level RPM when using refCredits
- [ ] 9.6 Test referral statistics API
- [ ] 9.7 Test referral page UI displays correctly
