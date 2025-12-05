## REMOVED Requirements

### Requirement: PayPal Checkout Integration
**Reason**: PayPal integration is no longer needed. System uses SePay only.
**Migration**: Remove all PayPal-related code and configuration.

### Requirement: PayPal Webhook Handling
**Reason**: PayPal integration is no longer needed.
**Migration**: Remove PayPal webhook endpoint and related code.

### Requirement: PayPal Frontend Integration
**Reason**: PayPal integration is no longer needed.
**Migration**: Remove International payment tab and PayPal button from checkout page.

### Requirement: PayPal Configuration
**Reason**: PayPal integration is no longer needed.
**Migration**: Remove PAYPAL_* environment variables.

---

## MODIFIED Requirements

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
- **WHEN** user clicks "Select" on a plan (Dev or Pro)
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
