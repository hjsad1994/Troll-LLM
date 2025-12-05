# payment Specification

## Purpose
TBD - created by archiving change add-payment-integration. Update Purpose after archive.
## Requirements
### Requirement: Payment Checkout with QR Code
The system SHALL allow authenticated users to initiate a checkout and receive a SePay QR code for payment.

#### Scenario: User initiates Dev plan checkout
- **WHEN** authenticated user calls `POST /api/payment/checkout` with `{ "plan": "dev" }`
- **THEN** the system SHALL create a pending payment record
- **AND** generate unique orderCode with format `TROLLDEV{timestamp}{random}`
- **AND** return QR code URL: `https://qr.sepay.vn/img?acc=VQRQAFRBD3142&bank=MBBank&amount=35000&des={orderCode}`
- **AND** return paymentId for status polling
- **AND** set expiresAt to 15 minutes from now

#### Scenario: User initiates Pro plan checkout
- **WHEN** authenticated user calls `POST /api/payment/checkout` with `{ "plan": "pro" }`
- **THEN** the system SHALL create a pending payment record
- **AND** generate unique orderCode with format `TROLLPRO{timestamp}{random}`
- **AND** return QR code URL with amount=79000
- **AND** return paymentId for status polling

#### Scenario: Invalid plan selection
- **WHEN** user calls `POST /api/payment/checkout` with invalid plan
- **THEN** the system SHALL return 400 error with message "Invalid plan"

#### Scenario: Unauthenticated checkout attempt
- **WHEN** unauthenticated user calls `POST /api/payment/checkout`
- **THEN** the system SHALL return 401 error

---

### Requirement: Payment Status Polling
The system SHALL allow frontend to poll for payment status updates.

#### Scenario: Poll pending payment
- **WHEN** user calls `GET /api/payment/{id}/status`
- **AND** payment exists and belongs to user
- **THEN** the system SHALL return current status ('pending', 'success', 'failed', 'expired')
- **AND** return remaining time until expiration

#### Scenario: Poll completed payment
- **WHEN** user polls a payment with status 'success'
- **THEN** the system SHALL return status 'success'
- **AND** return upgraded plan details

#### Scenario: Poll expired payment
- **WHEN** user polls a payment past expiresAt
- **THEN** the system SHALL update status to 'expired' if still pending
- **AND** return status 'expired'

---

### Requirement: Payment Webhook Handling
The system SHALL process payment webhooks from SePay to confirm payments.

**SePay Webhook Payload:**
```json
{
  "id": 92704,
  "gateway": "MBBank",
  "transactionDate": "2023-03-25 14:02:37",
  "accountNumber": "VQRQAFRBD3142",
  "code": null,
  "content": "TROLLDEV1701234567890AB",
  "transferType": "in",
  "transferAmount": 35000,
  "accumulated": 19077000,
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": ""
}
```

#### Scenario: Verify webhook authentication
- **WHEN** SePay sends POST to `/api/payment/webhook`
- **AND** header `Authorization` equals `Apikey {SEPAY_API_KEY}`
- **THEN** the system SHALL process the webhook
- **AND** continue to validation steps

#### Scenario: Reject unauthenticated webhook
- **WHEN** webhook request has missing or invalid `Authorization` header
- **THEN** the system SHALL return 401 Unauthorized
- **AND** NOT process the payment

#### Scenario: Successful payment webhook
- **WHEN** SePay sends POST to `/api/payment/webhook` with valid authentication
- **AND** `transferType` is "in" (incoming money)
- **AND** `accountNumber` matches `SEPAY_ACCOUNT`
- **AND** `content` field contains a pending payment orderCode (e.g., `TROLLDEV...`)
- **AND** `transferAmount` matches expected amount (35000 for Dev, 79000 for Pro)
- **THEN** the system SHALL update payment status to 'success'
- **AND** store `id` as `sepayTransactionId`
- **AND** update user plan to purchased plan (dev/pro)
- **AND** add credits to user (Dev: $225, Pro: $500)
- **AND** set planStartDate to current timestamp
- **AND** set planExpiresAt to 1 month from now
- **AND** return 200 OK

#### Scenario: Ignore outgoing transfer webhook
- **WHEN** webhook `transferType` is "out" (outgoing money)
- **THEN** the system SHALL ignore the webhook
- **AND** return 200 OK

#### Scenario: Ignore wrong account webhook
- **WHEN** webhook `accountNumber` does not match `SEPAY_ACCOUNT`
- **THEN** the system SHALL ignore the webhook
- **AND** return 200 OK

#### Scenario: Amount mismatch handling
- **WHEN** `content` matches a pending payment orderCode
- **AND** `transferAmount` does not match expected amount
- **THEN** the system SHALL log the mismatch for manual review
- **AND** NOT update payment status
- **AND** return 200 OK

#### Scenario: Duplicate webhook handling
- **WHEN** SePay sends webhook for already processed payment (status = 'success')
- **THEN** the system SHALL ignore the webhook
- **AND** return 200 OK (idempotent)

#### Scenario: Unmatched payment webhook
- **WHEN** `content` does not match any pending payment orderCode
- **THEN** the system SHALL log the unmatched payment for review
- **AND** return 200 OK

---

### Requirement: Checkout Page with QR Display
The system SHALL provide a checkout page displaying QR code for payment.

#### Scenario: Display checkout page with plan selection
- **WHEN** authenticated user navigates to `/checkout`
- **THEN** the system SHALL display two plan options:
  - Dev Plan: 35,000 VND/month, 225 credits, 300 RPM
  - Pro Plan: 79,000 VND/month, 500 credits, 1000 RPM
- **AND** show current plan badge if user already has one
- **AND** display "Select" button for each plan

#### Scenario: Display QR code after plan selection
- **WHEN** user clicks "Select" on a plan
- **THEN** the system SHALL call backend to create payment
- **AND** display QR code image from SePay URL
- **AND** show amount to pay (35,000 VND or 79,000 VND)
- **AND** show countdown timer (15 minutes)
- **AND** show instructions: "Scan QR code with your banking app"

#### Scenario: Payment status polling on checkout page
- **WHEN** QR code is displayed
- **THEN** the system SHALL poll payment status every 3 seconds
- **AND** show "Waiting for payment..." indicator

#### Scenario: Payment success on checkout page
- **WHEN** polling returns status 'success'
- **THEN** the system SHALL display success message
- **AND** show upgraded plan details
- **AND** provide link to dashboard

#### Scenario: QR code expiration
- **WHEN** countdown reaches zero
- **THEN** the system SHALL display "QR code expired" message
- **AND** provide option to generate new QR code

---

### Requirement: Homepage Payment Test Section
The system SHALL provide a payment test section on the homepage for quick plan purchase.

#### Scenario: Display payment test section on homepage
- **WHEN** user visits the homepage (`/`)
- **THEN** the system SHALL display a "Payment Test" section
- **AND** show two plan cards: Dev (35,000 VND) and Pro (79,000 VND)
- **AND** each card SHALL have a "Buy Now" button

#### Scenario: Click Dev plan on homepage
- **WHEN** authenticated user clicks "Buy Now" on Dev plan card
- **THEN** the system SHALL show a modal/popup with QR code
- **AND** display amount: 35,000 VND
- **AND** start polling for payment status
- **AND** show countdown timer (15 minutes)

#### Scenario: Click Pro plan on homepage
- **WHEN** authenticated user clicks "Buy Now" on Pro plan card
- **THEN** the system SHALL show a modal/popup with QR code
- **AND** display amount: 79,000 VND
- **AND** start polling for payment status
- **AND** show countdown timer (15 minutes)

#### Scenario: Unauthenticated user clicks buy
- **WHEN** unauthenticated user clicks "Buy Now" on any plan
- **THEN** the system SHALL redirect to login page
- **OR** show login prompt

#### Scenario: Payment success from homepage
- **WHEN** payment is confirmed via polling
- **THEN** the system SHALL show success message in modal
- **AND** update user plan display
- **AND** provide link to dashboard

---

### Requirement: Payment History
The system SHALL allow users to view their payment history.

#### Scenario: View payment history
- **WHEN** authenticated user calls `GET /api/payment/history`
- **THEN** the system SHALL return list of user's payments
- **AND** include fields: orderCode, plan, amount, status, createdAt
- **AND** sort by most recent first

#### Scenario: Empty payment history
- **WHEN** user has no payments
- **THEN** the system SHALL return empty array

---

### Requirement: Payment Data Model
The system SHALL store payment transactions with the following schema.

#### Scenario: Payment record structure
- **WHEN** a payment is created
- **THEN** it SHALL contain:
  - `userId`: string (reference to user)
  - `discordId`: string (optional, for Discord role assignment)
  - `plan`: 'dev' | 'pro'
  - `amount`: number (35000 or 79000 VND)
  - `currency`: 'VND'
  - `orderCode`: string (unique, used in QR des field)
  - `paymentMethod`: 'sepay'
  - `status`: 'pending' | 'success' | 'failed' | 'expired'
  - `sepayTransactionId`: string (optional, from SePay webhook)
  - `createdAt`: Date
  - `expiresAt`: Date (15 minutes from creation)
  - `completedAt`: Date (optional, when payment confirmed)

### Requirement: SePay Configuration
The system SHALL use environment variables for SePay integration.

#### Scenario: Load SePay configuration
- **WHEN** payment service initializes
- **THEN** it SHALL read from environment:
  - `SEPAY_ACCOUNT`: Bank account number (VQRQAFRBD3142)
  - `SEPAY_BANK`: Bank name (MBBank)
  - `SEPAY_API_KEY`: API key for webhook authentication
- **AND** use these for QR generation and webhook verification

#### Scenario: Generate QR code URL
- **WHEN** creating a payment checkout
- **THEN** QR URL SHALL be constructed as:
  - `https://qr.sepay.vn/img?acc={SEPAY_ACCOUNT}&bank={SEPAY_BANK}&amount={amount}&des={orderCode}`

#### Scenario: Verify webhook API key
- **WHEN** processing webhook request
- **THEN** the system SHALL verify header `Authorization` equals `Apikey {SEPAY_API_KEY}`

---

### Requirement: Referral Code Generation
The system SHALL generate a unique referral code for each user.

#### Scenario: Auto-generate referral code on user creation
- **WHEN** a new user is registered
- **THEN** the system SHALL generate a unique referral code
- **AND** store it in the user's `referralCode` field
- **AND** the code SHALL be 8 characters alphanumeric

#### Scenario: Get user referral link
- **WHEN** authenticated user calls `GET /api/user/referral`
- **THEN** the system SHALL return:
  - `referralCode`: user's unique referral code
  - `referralLink`: full URL with ref parameter (e.g., `https://domain.com/register?ref={code}`)

---

### Requirement: Referral Registration Tracking
The system SHALL track referral relationships during registration.

#### Scenario: Register with valid referral code
- **WHEN** user registers with URL parameter `?ref={referralCode}`
- **AND** the referral code exists and belongs to another user
- **THEN** the system SHALL store the referrer's userId in new user's `referredBy` field
- **AND** complete registration normally

#### Scenario: Register with invalid referral code
- **WHEN** user registers with URL parameter `?ref={invalidCode}`
- **AND** the referral code does not exist
- **THEN** the system SHALL ignore the invalid referral code
- **AND** complete registration normally without referral relationship

#### Scenario: Register without referral code
- **WHEN** user registers without `ref` parameter
- **THEN** the system SHALL complete registration normally
- **AND** leave `referredBy` field empty

---

### Requirement: Referral Credits (Separate Balance)
The system SHALL maintain referral credits as a separate balance from main credits.

#### Scenario: Dev plan payment with referral
- **WHEN** a referred user (has `referredBy` set) completes payment for Dev plan
- **AND** this is the user's first successful payment
- **THEN** the system SHALL add 25 to the referred user's `refCredits` field
- **AND** add 25 to the referrer's `refCredits` field
- **AND** log the bonus transaction for both users

#### Scenario: Pro plan payment with referral
- **WHEN** a referred user (has `referredBy` set) completes payment for Pro plan
- **AND** this is the user's first successful payment
- **THEN** the system SHALL add 50 to the referred user's `refCredits` field
- **AND** add 50 to the referrer's `refCredits` field
- **AND** log the bonus transaction for both users

#### Scenario: Payment without referral
- **WHEN** a user without `referredBy` completes payment
- **THEN** the system SHALL NOT award any referral credits
- **AND** process payment normally

#### Scenario: Subsequent payment with referral
- **WHEN** a referred user completes a second or subsequent payment
- **THEN** the system SHALL NOT award referral credits again for this user
- **AND** process payment normally

#### Scenario: Multiple successful referrals
- **WHEN** User A refers both User B and User C
- **AND** User B completes payment for Dev plan
- **AND** User C completes payment for Pro plan
- **THEN** User A SHALL receive 25 refCredits (from User B) + 50 refCredits (from User C) = 75 total refCredits
- **AND** each referral bonus is independent and cumulative

---

### Requirement: Referral Credits Usage Priority
The system SHALL use main credits first, then referral credits when main credits are exhausted.

#### Scenario: API request with sufficient main credits
- **WHEN** user makes API request costing X credits
- **AND** user has sufficient main `credits` balance
- **THEN** the system SHALL deduct X from main `credits`
- **AND** NOT touch `refCredits`
- **AND** apply user's plan RPM limit

#### Scenario: API request with exhausted main credits
- **WHEN** user makes API request costing X credits
- **AND** user's main `credits` balance is 0 or insufficient
- **AND** user has sufficient `refCredits` balance
- **THEN** the system SHALL deduct X from `refCredits`
- **AND** apply **Pro-level RPM (1000 RPM)** for this request

#### Scenario: API request with partial main credits
- **WHEN** user makes API request costing X credits
- **AND** user has Y main credits where Y < X
- **AND** user has sufficient `refCredits` to cover (X - Y)
- **THEN** the system SHALL deduct Y from main `credits` (to 0)
- **AND** deduct (X - Y) from `refCredits`
- **AND** apply **Pro-level RPM (1000 RPM)** for this request

#### Scenario: API request with no credits available
- **WHEN** user makes API request
- **AND** user has 0 main `credits` AND 0 `refCredits`
- **THEN** the system SHALL reject the request with insufficient credits error

---

### Requirement: Referral Statistics
The system SHALL provide referral statistics for users.

#### Scenario: Get referral statistics
- **WHEN** authenticated user calls `GET /api/user/referral/stats`
- **THEN** the system SHALL return:
  - `totalReferrals`: number of users who registered with this user's referral code
  - `successfulReferrals`: number of referred users who completed payment
  - `totalRefCreditsEarned`: total referral credits earned from referrals
  - `currentRefCredits`: current referral credits balance

#### Scenario: Empty referral statistics
- **WHEN** user has no referrals
- **THEN** the system SHALL return all statistics as 0

---

### Requirement: Referred Users List
The system SHALL provide a list of users referred by the current user.

#### Scenario: Get referred users list
- **WHEN** authenticated user calls `GET /api/user/referral/list`
- **THEN** the system SHALL return list of referred users with:
  - `username`: masked username (format: `abc***xyz`)
  - `status`: 'registered' | 'paid'
  - `plan`: plan purchased (null if not paid, 'dev' | 'pro' if paid)
  - `bonusEarned`: refCredits earned from this referral (0 if not paid)
  - `createdAt`: registration date

#### Scenario: Empty referred users list
- **WHEN** user has no referrals
- **THEN** the system SHALL return empty array

#### Scenario: Referred users sorted by date
- **WHEN** user has multiple referrals
- **THEN** the list SHALL be sorted by most recent first

---

### Requirement: Referral Dashboard Page
The system SHALL provide a referral management page in the user dashboard.

#### Scenario: Display referral page
- **WHEN** authenticated user navigates to `/dashboard/referral`
- **THEN** the system SHALL display:
  - User's referral link with copy button
  - Statistics cards (total referrals, successful referrals, refCredits earned, current balance)
  - Table of referred users

#### Scenario: Copy referral link
- **WHEN** user clicks copy button on referral link
- **THEN** the system SHALL copy the full referral URL to clipboard
- **AND** show success notification

#### Scenario: Referral menu in sidebar
- **WHEN** user views dashboard sidebar
- **THEN** the sidebar SHALL include "Referral" menu item
- **AND** clicking it navigates to `/dashboard/referral`

#### Scenario: Display refCredits in dashboard
- **WHEN** user views any dashboard page
- **THEN** the system SHALL display current `refCredits` balance
- **AND** display it separately from main `credits` balance

---

