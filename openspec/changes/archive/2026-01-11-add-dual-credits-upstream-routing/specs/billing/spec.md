## ADDED Requirements

### Requirement: Dual Credits System
The system SHALL maintain two separate credit balances per user: `credits` for OhMyGPT upstream and `creditsNew` for OpenHands upstream.

#### Scenario: User has separate balances for each upstream
- **WHEN** a user account is queried from the `usersNew` collection
- **THEN** the user document SHALL contain a `credits` field (Number, default 0)
- **AND** the user document SHALL contain a `creditsNew` field (Number, default 0)
- **AND** the user document SHALL contain a `creditsUsed` field tracking OhMyGPT token usage
- **AND** the user document SHALL contain a `tokensUserNew` field (Number, default 0) tracking OpenHands token usage

#### Scenario: Both credit fields support expiration
- **WHEN** either `credits` or `creditsNew` is purchased or topped up
- **THEN** the `expiresAt` field SHALL be set to 7 days from the purchase timestamp
- **AND** both credit balances SHALL expire simultaneously when `expiresAt` is reached

### Requirement: Payment Credits to OpenHands Balance
The payment service SHALL add purchased credits exclusively to the `creditsNew` field for OpenHands upstream billing.

#### Scenario: User purchases credits via payment
- **WHEN** a payment is successfully completed (status = 'success')
- **THEN** the purchased credits amount SHALL be added to the `creditsNew` field
- **AND** the `credits` field SHALL NOT be modified
- **AND** the `expiresAt` field SHALL be updated to 7 days from purchase timestamp
- **AND** promo bonus (if active) SHALL apply to the `creditsNew` amount

#### Scenario: Payment with promo bonus
- **WHEN** a payment is completed during an active promo period (e.g., 20% bonus)
- **THEN** the base credits amount SHALL be calculated: `finalCredits = baseCredits * (1 + bonusPercent / 100)`
- **AND** the `finalCredits` SHALL be added to `creditsNew`
- **AND** the promo bonus SHALL be logged in payment records

#### Scenario: Payment service logs creditsNew changes
- **WHEN** credits are added to `creditsNew` after payment
- **THEN** the payment record SHALL store `creditsBefore` and `creditsAfter` reflecting `creditsNew` balance
- **AND** console logs SHALL indicate credits added to `creditsNew` field

### Requirement: Upstream-Specific Billing Routing
The GoProxy billing system SHALL deduct from `creditsNew` for OpenHands (port 8004) requests and from `credits` for OhMyGPT (port 8005) requests.

#### Scenario: OpenHands request billing
- **WHEN** a request is routed to OpenHands upstream (port 8004)
- **THEN** the billing system SHALL deduct token costs from the user's `creditsNew` balance
- **AND** the billing system SHALL increment the user's `tokensUserNew` field with token usage
- **AND** the request SHALL be rejected if `creditsNew` balance is insufficient

#### Scenario: OhMyGPT request billing
- **WHEN** a request is routed to OhMyGPT upstream (port 8005)
- **THEN** the billing system SHALL deduct token costs from the user's `credits` balance
- **AND** the billing system SHALL increment the user's `creditsUsed` field with token usage
- **AND** the request SHALL be rejected if `credits` balance is insufficient

#### Scenario: Insufficient creditsNew for OpenHands
- **WHEN** an OpenHands request is received and the user's `creditsNew` balance is less than the request cost
- **THEN** the request SHALL be rejected with HTTP 402 Payment Required
- **AND** the error message SHALL state: "insufficient credits for request. Cost: $X.XX, Balance: $Y.YY"
- **AND** the balance SHALL reflect the `creditsNew` value

#### Scenario: Pre-request affordability check for OpenHands
- **WHEN** an OpenHands request is received
- **THEN** the system SHALL check if `creditsNew >= estimated_request_cost` BEFORE processing
- **AND** the request SHALL be blocked if `creditsNew` is insufficient
- **AND** the system SHALL use `CanAffordRequest()` with `creditsNew` balance for validation

## MODIFIED Requirements

### Requirement: Temporary Payment Disablement
The system SHALL provide the ability to temporarily disable payment functionality across the application while keeping other features accessible.

#### Scenario: Dashboard payment button disabled
- **WHEN** a user is on the dashboard page and payment functionality is disabled
- **THEN** the "Buy Credits" button SHALL be disabled or hidden
- **AND** a notice SHALL be displayed explaining payments are temporarily unavailable

#### Scenario: Checkout page shows maintenance notice
- **WHEN** a user navigates to /checkout while payment functionality is disabled
- **THEN** a maintenance notice SHALL be displayed
- **AND** the notice SHALL explain payments are temporarily unavailable
- **AND** the notice SHALL provide an option to return to the homepage

#### Scenario: Payment modal shows disabled message
- **WHEN** a user attempts to open the payment modal while payment functionality is disabled
- **THEN** the modal SHALL display a disabled notice
- **AND** the notice SHALL explain payments are temporarily unavailable

#### Scenario: Payment adds to creditsNew field
- **WHEN** payment functionality is enabled and a payment succeeds
- **THEN** the purchased credits SHALL be added to the user's `creditsNew` field
- **AND** the `credits` field SHALL remain unchanged
