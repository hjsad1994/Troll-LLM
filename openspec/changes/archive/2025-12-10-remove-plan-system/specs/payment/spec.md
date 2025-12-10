## REMOVED Requirements

### Requirement: Pro Troll Plan Support
**Reason**: Không còn hệ thống plan. Payment chỉ thêm credits.
**Migration**: Các gói payment chuyển thành credit packages.

---

## MODIFIED Requirements

### Requirement: Payment Checkout with QR Code
The system SHALL allow authenticated users to purchase credits via SePay QR code payment.

#### Scenario: User initiates credits purchase
- **WHEN** authenticated user calls `POST /api/payment/checkout` with `{ "package": "basic" }` or `{ "package": "premium" }`
- **THEN** the system SHALL create a pending payment record
- **AND** generate unique orderCode
- **AND** return QR code URL for SePay
- **AND** return paymentId for status polling
- **AND** set expiresAt to 15 minutes from now

#### Scenario: Basic package checkout
- **WHEN** user selects "basic" package
- **THEN** orderCode starts with "TROLLBASIC"
- **AND** amount is based on configured package price

#### Scenario: Premium package checkout
- **WHEN** user selects "premium" package
- **THEN** orderCode starts with "TROLLPREM"
- **AND** amount is based on configured package price

#### Scenario: Invalid package selection
- **WHEN** user calls checkout with invalid package
- **THEN** the system SHALL return 400 error with message "Invalid package"

---

### Requirement: Payment Webhook Handling
The system SHALL process payment webhooks to add credits to user balance.

#### Scenario: Successful payment webhook
- **WHEN** SePay sends valid webhook for successful payment
- **AND** payment is verified and amount matches
- **THEN** the system SHALL update payment status to 'success'
- **AND** add credits to user's `credits` field based on package
- **AND** NOT modify any plan field (plan concept removed)
- **AND** return 200 OK

---

### Requirement: Checkout Page with Credits Display
The system SHALL provide a checkout page for purchasing credits.

#### Scenario: Display checkout page
- **WHEN** authenticated user navigates to `/checkout`
- **THEN** the system SHALL display available credit packages:
  - Package options with credits amount and VND price
- **AND** display user's current credits balance
- **AND** display "Buy" button for each package

#### Scenario: Display QR code after package selection
- **WHEN** user clicks "Buy" on a package
- **THEN** the system SHALL call backend to create payment
- **AND** display QR code image
- **AND** show amount to pay
- **AND** show countdown timer (15 minutes)

---

### Requirement: Payment Data Model
The system SHALL store payment transactions.

#### Scenario: Payment record structure
- **WHEN** a payment is created
- **THEN** it SHALL contain:
  - `userId`: string (reference to user)
  - `package`: string (package identifier, e.g., 'basic', 'premium')
  - `creditsAmount`: number (credits to be added)
  - `amount`: number (VND amount)
  - `currency`: 'VND'
  - `orderCode`: string (unique)
  - `paymentMethod`: 'sepay'
  - `status`: 'pending' | 'success' | 'failed' | 'expired'
  - `sepayTransactionId`: string (optional)
  - `createdAt`: Date
  - `expiresAt`: Date
  - `completedAt`: Date (optional)
- **AND** SHALL NOT contain `plan` field

---

### Requirement: Referral Credits (Separate Balance)
The system SHALL maintain referral credits as a separate balance from main credits.

#### Scenario: Payment with referral bonus
- **WHEN** a referred user completes first payment
- **THEN** the system SHALL add bonus to referred user's `refCredits`
- **AND** add bonus to referrer's `refCredits`
- **AND** bonus amount is configurable per package

#### Scenario: Payment without referral
- **WHEN** user without `referredBy` completes payment
- **THEN** the system SHALL NOT award any referral credits
- **AND** process payment normally (add credits only)
