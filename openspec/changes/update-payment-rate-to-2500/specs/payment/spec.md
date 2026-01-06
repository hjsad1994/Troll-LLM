## ADDED Requirements

### Requirement: Payment Rate Configuration

The system SHALL maintain a single source of truth for the VND to USD exchange rate used for all payment calculations, QR code generation, and UI displays.

#### Scenario: Rate constant definition

- **WHEN** the application starts
- **THEN** the VND_RATE constant SHALL be defined as 2500 (2500 VND = $1 USD)
- **AND** this constant SHALL be used consistently across backend and frontend

#### Scenario: Backend payment calculation

- **WHEN** a user creates a checkout session for a given USD amount
- **THEN** the system SHALL calculate the VND amount as `USD amount × 2500`
- **AND** the QR code SHALL be generated with this VND amount
- **AND** the payment record SHALL store both USD credits and VND amount

#### Scenario: Frontend display consistency

- **WHEN** a user views the checkout page
- **THEN** all VND amounts SHALL be calculated using the 2500 rate
- **AND** the display SHALL show correct VND amounts (e.g., $20 = 50,000 VND, $100 = 250,000 VND)
- **AND** the payment summary SHALL accurately reflect the conversion

#### Scenario: Payment API configuration

- **WHEN** the frontend requests payment configuration via `/api/payment/config`
- **THEN** the response SHALL include `vndRate: 2500`
- **AND** this rate SHALL match the constant used in all calculations

### Requirement: Pricing Page Rate Alignment

The system SHALL display pricing information on the pricing page that reflects the current 2500 VND/USD exchange rate.

#### Scenario: Subscription plan display

- **WHEN** a user views the pricing page subscription plans
- **THEN** the displayed VND prices SHALL be calculated based on the 2500 rate
- **AND** any reference prices or discounts SHALL accurately reflect the new rate

#### Scenario: Pay-as-you-go pricing display

- **WHEN** a user views the pay-as-you-go credit purchase options
- **THEN** the minimum purchase ($20) SHALL display as 50,000 VND
- **AND** the maximum purchase ($100) SHALL display as 250,000 VND
- **AND** all intermediate amounts SHALL be calculated consistently

## MODIFIED Requirements

### Requirement: Payment QR Code Generation

The system SHALL generate QR codes for SePay payments using the correct VND amount based on the 2500 VND/USD exchange rate.

#### Scenario: QR code for minimum amount

- **WHEN** a user purchases the minimum $20 credits
- **THEN** the QR code SHALL be generated for 50,000 VND
- **AND** the order description SHALL include the username and order code

#### Scenario: QR code for maximum amount

- **WHEN** a user purchases the maximum $100 credits
- **THEN** the QR code SHALL be generated for 250,000 VND
- **AND** the QR code URL SHALL include the correct SePay account and bank details

#### Scenario: QR code for custom amounts

- **WHEN** a user selects a custom amount between $20-$100
- **THEN** the QR code SHALL be generated for `amount × 2500` VND
- **AND** the amount SHALL be rounded to a whole number
