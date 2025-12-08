## 1. Backend Model Changes
- [ ] 1.1 Update User model: remove `credits`, add `tokenBalance` (number in tokens, not millions)
- [ ] 1.2 Update User model: remove `refCredits`, add `refTokens`
- [ ] 1.3 Update User model: change `planExpiresAt` logic for weekly expiration
- [ ] 1.4 Remove plan types (free/dev/pro/pro-troll), use token-based access only
- [ ] 1.5 Add migration script to convert existing credits to tokens

## 2. Backend Service Changes
- [ ] 2.1 Update user.service.ts - token balance operations
- [ ] 2.2 Update payment.service.ts - new packages (6M/20k, 12M/40k)
- [ ] 2.3 Update payment webhook - add tokens instead of credits
- [ ] 2.4 Update expiration logic - 1 week instead of 1 month
- [ ] 2.5 Remove refCredits logic, replace with refTokens

## 3. Go Proxy Changes
- [ ] 3.1 Update billing calculation: deduct actual tokens used (input + output)
- [ ] 3.2 Remove USD-based cost calculation
- [ ] 3.3 Update usage tracker to use token balance
- [ ] 3.4 Update validator to check tokenBalance > 0

## 4. Frontend Dashboard Changes
- [ ] 4.1 Update dashboard to show "Tokens" instead of "Credits"
- [ ] 4.2 Display token balance as "6M", "12M" format
- [ ] 4.3 Show expiration date (weekly)
- [ ] 4.4 Update progress bar to show tokens used vs total
- [ ] 4.5 Remove credits-related UI components

## 5. Frontend Payment Changes
- [ ] 5.1 Update PaymentModal with new packages (6M/20k, 12M/40k)
- [ ] 5.2 Update checkout page with new pricing
- [ ] 5.3 Update i18n translations

## 6. Admin Changes
- [ ] 6.1 Update admin users table - show tokenBalance instead of credits
- [ ] 6.2 Update admin edit user modal
- [ ] 6.3 Update admin dashboard stats

## 7. Testing
- [ ] 7.1 Test token purchase flow
- [ ] 7.2 Test token deduction on API requests
- [ ] 7.3 Test weekly expiration
- [ ] 7.4 Test referral tokens
