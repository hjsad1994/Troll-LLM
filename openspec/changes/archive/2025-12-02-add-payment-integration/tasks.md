## 1. Backend Setup
- [ ] 1.1 Add environment variables (SEPAY_ACCOUNT, SEPAY_BANK, SEPAY_API_KEY)
- [ ] 1.2 Create Payment model (`backend/src/models/payment.model.ts`)
- [ ] 1.3 Create Payment repository (`backend/src/repositories/payment.repository.ts`)
- [ ] 1.4 Create Payment service (`backend/src/services/payment.service.ts`)
- [ ] 1.5 Create Payment routes (`backend/src/routes/payment.routes.ts`)
- [ ] 1.6 Register payment routes in index.ts
- [ ] 1.7 Create webhook middleware for API key verification

## 2. Payment API Endpoints
- [ ] 2.1 POST `/api/payment/checkout` - Create pending payment, return QR code URL
- [ ] 2.2 POST `/api/payment/webhook` - Handle SePay webhook callback
  - [ ] 2.2.1 Verify `Authorization: Apikey {SEPAY_API_KEY}` header
  - [ ] 2.2.2 Validate `transferType` is "in"
  - [ ] 2.2.3 Validate `accountNumber` matches SEPAY_ACCOUNT
  - [ ] 2.2.4 Extract orderCode from `content` field
  - [ ] 2.2.5 Verify `transferAmount` matches expected amount
  - [ ] 2.2.6 Update payment status and upgrade user plan
- [ ] 2.3 GET `/api/payment/:id/status` - Poll payment status
- [ ] 2.4 GET `/api/payment/history` - Get user's payment history

## 3. Frontend Checkout Page
- [ ] 3.1 Create `/checkout` page with plan selection (Dev/Pro)
- [ ] 3.2 Display QR code image from SePay URL
- [ ] 3.3 Implement payment status polling (every 3 seconds)
- [ ] 3.4 Show countdown timer for QR expiration (15 minutes)
- [ ] 3.5 Create success state when payment confirmed
- [ ] 3.6 Add checkout link to pricing page (replace Discord link)
- [ ] 3.7 Add checkout link to user dashboard for plan upgrade
- [ ] 3.8 Add payment test section on homepage with Dev/Pro buttons

## 4. Plan Upgrade Logic
- [ ] 4.1 Upon successful webhook callback, upgrade user plan
- [ ] 4.2 Add credits based on plan (Dev: $225, Pro: $500)
- [ ] 4.3 Set planStartDate and planExpiresAt (1 month)
- [ ] 4.4 Mark payment as completed

## 5. Testing & Verification
- [ ] 5.1 Test QR code generation with correct amount
- [ ] 5.2 Test payment status polling
- [ ] 5.3 Test webhook callback handling
- [ ] 5.4 Verify plan upgrade after successful payment
- [ ] 5.5 Test QR expiration scenario
- [ ] 5.6 Run lint and typecheck
