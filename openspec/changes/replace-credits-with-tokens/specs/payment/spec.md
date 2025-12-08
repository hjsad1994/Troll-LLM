## REMOVED Requirements

### Requirement: Plan Configuration (Dev/Pro/Pro-Troll)
**Reason**: Replaced by simple token packages without plan tiers
**Migration**: Users purchase token packages instead of plans

### Requirement: Referral Credits
**Reason**: Replaced by referral tokens
**Migration**: refCredits converted to refTokens

---

## MODIFIED Requirements

### Requirement: Payment Checkout with QR Code
The system SHALL allow authenticated users to purchase token packages via SePay QR code.

#### Scenario: User purchases 6M token package
- **WHEN** authenticated user calls `POST /api/payment/checkout` with `{ "package": "6m" }`
- **THEN** the system SHALL create a pending payment record
- **AND** generate unique orderCode with format `TROLL6M{timestamp}{random}`
- **AND** return QR code URL with amount=20000
- **AND** return paymentId for status polling
- **AND** set expiresAt to 15 minutes from now

#### Scenario: User purchases 12M token package
- **WHEN** authenticated user calls `POST /api/payment/checkout` with `{ "package": "12m" }`
- **THEN** the system SHALL create a pending payment record
- **AND** generate unique orderCode with format `TROLL12M{timestamp}{random}`
- **AND** return QR code URL with amount=40000
- **AND** return paymentId for status polling

#### Scenario: Invalid package selection
- **WHEN** user calls `POST /api/payment/checkout` with invalid package
- **THEN** the system SHALL return 400 error with message "Invalid package"

---

### Requirement: Payment Webhook Handling
The system SHALL process payment webhooks from SePay to confirm token purchases.

#### Scenario: Successful 6M token purchase
- **WHEN** SePay webhook confirms payment for 6M package (20,000 VND)
- **THEN** the system SHALL add 6,000,000 tokens to user's tokenBalance
- **AND** set expiresAt to 7 days from now
- **AND** set purchasedAt to current timestamp
- **AND** update payment status to 'success'

#### Scenario: Successful 12M token purchase
- **WHEN** SePay webhook confirms payment for 12M package (40,000 VND)
- **THEN** the system SHALL add 12,000,000 tokens to user's tokenBalance
- **AND** set expiresAt to 7 days from now
- **AND** set purchasedAt to current timestamp
- **AND** update payment status to 'success'

#### Scenario: Amount validation
- **WHEN** webhook transferAmount does not match expected (20000 or 40000)
- **THEN** the system SHALL log mismatch for review
- **AND** NOT update user tokens

---

### Requirement: Checkout Page with Token Packages
The system SHALL display token package options on checkout page.

#### Scenario: Display token packages
- **WHEN** authenticated user navigates to `/checkout`
- **THEN** the system SHALL display two package options:
  - 6M Tokens: 20,000 VND / 1 week
  - 12M Tokens: 40,000 VND / 1 week
- **AND** show "Select" button for each package

#### Scenario: Display QR code after package selection
- **WHEN** user clicks "Select" on a package
- **THEN** the system SHALL create payment and display QR code
- **AND** show amount (20,000 or 40,000 VND)
- **AND** show countdown timer (15 minutes)

---

## ADDED Requirements

### Requirement: Token Package Pricing
The system SHALL support two token packages with weekly validity.

#### Scenario: 6M Token Package
- **WHEN** user selects 6M package
- **THEN** price SHALL be 20,000 VND
- **AND** user receives 6,000,000 tokens
- **AND** tokens valid for 7 days

#### Scenario: 12M Token Package
- **WHEN** user selects 12M package
- **THEN** price SHALL be 40,000 VND
- **AND** user receives 12,000,000 tokens
- **AND** tokens valid for 7 days

---

### Requirement: Referral Tokens (Replaces Referral Credits)
The system SHALL award referral tokens instead of credits.

#### Scenario: 6M package referral bonus
- **WHEN** referred user purchases 6M package
- **AND** this is user's first purchase
- **THEN** both referrer and referred user receive 500,000 referral tokens (0.5M)

#### Scenario: 12M package referral bonus
- **WHEN** referred user purchases 12M package
- **AND** this is user's first purchase
- **THEN** both referrer and referred user receive 1,000,000 referral tokens (1M)

#### Scenario: Referral tokens usage
- **WHEN** user's main tokenBalance is exhausted
- **AND** user has refTokens available
- **THEN** the system SHALL deduct from refTokens

---

### Requirement: Token Stacking on Renewal
The system SHALL allow users to renew before expiration.

#### Scenario: Purchase while tokens remaining
- **WHEN** user purchases new package while having remaining tokens
- **THEN** the system SHALL ADD new tokens to existing balance
- **AND** EXTEND expiresAt by 7 days from current expiration (not from now)
- **AND** log the renewal transaction

#### Scenario: Purchase after expiration
- **WHEN** user purchases package after tokens expired
- **THEN** the system SHALL SET tokenBalance to new package amount
- **AND** SET expiresAt to 7 days from now
