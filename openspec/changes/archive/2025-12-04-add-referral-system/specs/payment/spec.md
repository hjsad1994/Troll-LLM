## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Payment Data Model
The system SHALL store payment transactions with the following schema.

#### Scenario: Payment record structure
- **WHEN** a payment is created
- **THEN** it SHALL contain:
  - `userId`: string (reference to user)
  - `plan`: 'dev' | 'pro'
  - `amount`: number (35000 or 79000 VND for SePay, 4.00 USD for PayPal Pro)
  - `currency`: 'VND' | 'USD'
  - `orderCode`: string (unique, used in QR des field) - for SePay
  - `paypalOrderId`: string (PayPal order ID) - for PayPal
  - `paymentMethod`: 'sepay' | 'paypal'
  - `status`: 'pending' | 'success' | 'failed' | 'expired'
  - `sepayTransactionId`: string (optional, from SePay webhook)
  - `paypalCaptureId`: string (optional, from PayPal capture)
  - `referralBonusAwarded`: boolean (default: false, true if referral bonus was given)
  - `createdAt`: Date
  - `expiresAt`: Date (15 minutes from creation)
  - `completedAt`: Date (optional, when payment confirmed)
