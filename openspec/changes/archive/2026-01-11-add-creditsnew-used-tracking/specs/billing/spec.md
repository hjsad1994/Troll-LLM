## MODIFIED Requirements
### Requirement: Dual Credits System
The system SHALL maintain two separate credit balances per user: `credits` for OhMyGPT upstream and `creditsNew` for OpenHands upstream.

#### Scenario: User has separate balances for each upstream
- **WHEN** a user account is queried from the `usersNew` collection
- **THEN** the user document SHALL contain a `credits` field (Number, default 0)
- **AND** the user document SHALL contain a `creditsNew` field (Number, default 0)
- **AND** the user document SHALL contain a `creditsUsed` field tracking OhMyGPT USD cost
- **AND** the user document SHALL contain a `creditsNewUsed` field (Number, default 0) tracking OpenHands USD cost
- **AND** the user document SHALL contain a `tokensUserNew` field (Number, default 0) tracking OpenHands token count (for analytics)

#### Scenario: Both credit fields support expiration
- **WHEN** either `credits` or `creditsNew` is purchased or topped up
- **THEN** the `expiresAt` field SHALL be set to 7 days from the purchase timestamp
- **AND** both credit balances SHALL expire simultaneously when `expiresAt` is reached

### Requirement: Upstream-Specific Billing Routing
The GoProxy billing system SHALL deduct from `creditsNew` for OpenHands (port 8004) requests and from `credits` for OhMyGPT (port 8005) requests.

#### Scenario: OpenHands request billing
- **WHEN** a request is routed to OpenHands upstream (port 8004)
- **THEN** the billing system SHALL deduct token costs from the user's `creditsNew` balance
- **AND** the billing system SHALL increment the user's `creditsNewUsed` field with the USD cost
- **AND** the billing system SHALL increment the user's `tokensUserNew` field with token count (for analytics)
- **AND** the request SHALL be rejected if `creditsNew` balance is insufficient

#### Scenario: OhMyGPT request billing
- **WHEN** a request is routed to OhMyGPT upstream (port 8005)
- **THEN** the billing system SHALL deduct token costs from the user's `credits` balance
- **AND** the billing system SHALL increment the user's `creditsUsed` field with the USD cost
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

## ADDED Requirements
### Requirement: OpenHands USD Cost Tracking
The system SHALL track USD costs consumed via OpenHands upstream in the `creditsNewUsed` field.

#### Scenario: creditsNewUsed increments with USD cost
- **WHEN** an OpenHands request completes successfully
- **THEN** the `creditsNewUsed` field SHALL be incremented by the exact USD cost of the request
- **AND** the increment value SHALL match the amount deducted from `creditsNew`

#### Scenario: creditsNewUsed displayed in user profile API
- **WHEN** a user profile is fetched via API
- **THEN** the response SHALL include the `creditsNewUsed` field
- **AND** the value SHALL reflect the cumulative USD spent on OpenHands

#### Scenario: creditsNewUsed displayed in admin users-new page
- **WHEN** an admin views the users-new management page
- **THEN** each user row SHALL display the `creditsNewUsed` value
- **AND** the column SHALL be labeled "OpenHands Used" or similar
