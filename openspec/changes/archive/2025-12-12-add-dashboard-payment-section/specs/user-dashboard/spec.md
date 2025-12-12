## ADDED Requirements

### Requirement: Dashboard Quick Payment Section
The system SHALL provide a quick payment option directly on the user dashboard for convenient credit purchases.

#### Scenario: Display Buy Credits button on dashboard
- **WHEN** authenticated user views dashboard at `/dashboard`
- **THEN** the Billing Card section SHALL display a "Buy Credits" button
- **AND** the button SHALL be visually prominent with primary/accent styling
- **AND** the button SHALL be placed below the current credits display

#### Scenario: Open payment modal from dashboard
- **WHEN** user clicks "Buy Credits" button on dashboard
- **THEN** the system SHALL open a payment modal overlay
- **AND** the modal SHALL display credit amount selection options
- **AND** the user SHALL NOT be navigated away from the dashboard

#### Scenario: Display payment amount options in modal
- **WHEN** payment modal is open
- **THEN** the system SHALL display amount options: $20, $50, $100
- **AND** show VND equivalent for each option (at 1000 VND = $1 rate)
- **AND** highlight minimum amount ($20) if user has low credits

#### Scenario: Generate QR code for selected amount
- **WHEN** user selects an amount in the payment modal
- **THEN** the system SHALL call `POST /api/payment/checkout` with selected amount
- **AND** display SePay QR code for payment
- **AND** show countdown timer (15 minutes expiration)
- **AND** show payment amount in VND

#### Scenario: Poll payment status from dashboard modal
- **WHEN** QR code is displayed in dashboard modal
- **THEN** the system SHALL poll payment status every 3 seconds
- **AND** show "Waiting for payment..." indicator
- **AND** display remaining time countdown

#### Scenario: Payment success in dashboard modal
- **WHEN** polling returns payment status 'success'
- **THEN** the system SHALL display success message in modal
- **AND** update credits display on dashboard immediately
- **AND** show option to close modal
- **AND** NOT navigate user away from dashboard

#### Scenario: Payment expired in dashboard modal
- **WHEN** payment timer reaches zero
- **THEN** the system SHALL display "Payment expired" message
- **AND** provide option to generate new QR code
- **AND** user can close modal and try again

---

### Requirement: Dashboard Payment History Display
The system SHALL display recent payment history on the user dashboard.

#### Scenario: Display payment history section on dashboard
- **WHEN** authenticated user views dashboard at `/dashboard`
- **THEN** the system SHALL display a "Recent Payments" section
- **AND** show last 5 payments in a compact list/table format
- **AND** provide "View All" link to full payment history

#### Scenario: Display payment history item details
- **WHEN** payment history is displayed on dashboard
- **THEN** each item SHALL show:
  - Date/time of payment (formatted as "DD/MM HH:mm")
  - Amount in USD and VND
  - Status badge (success/pending/expired)
- **AND** successful payments SHALL have green badge
- **AND** pending payments SHALL have yellow badge

#### Scenario: Empty payment history on dashboard
- **WHEN** user has no payment history
- **THEN** the system SHALL display "No payments yet"
- **AND** show prompt to make first purchase with "Buy Credits" CTA

#### Scenario: Navigate to full payment history
- **WHEN** user clicks "View All" link
- **THEN** the system SHALL navigate to `/dashboard/payment-history` or show full history modal
