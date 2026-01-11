# billing Specification

## Purpose
TBD - created by archiving change disable-payments-temporarily. Update Purpose after archive.
## Requirements
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

### Requirement: Payment Disablement Configuration
The system SHALL use a configuration flag to control payment functionality enablement.

#### Scenario: Configure payment disablement via environment variable
- **WHEN** the administrator sets the PAYMENTS_ENABLED environment variable to false
- **THEN** payment functionality SHALL be disabled across all frontend interfaces
- **AND** the configuration SHALL be read at build time or runtime

#### Scenario: Re-enable payments
- **WHEN** the administrator sets the PAYMENTS_ENABLED environment variable to true or removes it
- **THEN** payment functionality SHALL be restored
- **AND** all payment interfaces SHALL function normally

### Requirement: Profit Calculation and Display
The admin billing dashboard SHALL display profit information for successful payments based on the pricing policy.

#### Scenario: Profit column in payments table
- **WHEN** an administrator views the payments table at `/admin/billing`
- **THEN** a "Profit" column SHALL be displayed for each payment row
- **AND** profit SHALL be calculated as: `creditsUSD * 665` (profit per $1 sold)
- **AND** profit SHALL only be calculated for payments with `completedAt >= 2026-01-06 20:49:00` (VN timezone)
- **AND** profit for payments before the cutoff SHALL display as "0 VND"

#### Scenario: Total profit stat card
- **WHEN** an administrator views the billing dashboard
- **THEN** a "Total Profit" stat card SHALL be displayed
- **AND** the total SHALL aggregate profit from all successful payments in the filtered period
- **AND** only payments meeting the cutoff criteria SHALL be included in the total

#### Scenario: Profit API response field
- **WHEN** the backend API returns payment data
- **THEN** each payment SHALL include a `profitVND` field
- **AND** `profitVND` SHALL contain the calculated profit in VND (integer)
- **AND** `profitVND` SHALL be 0 for payments before the policy change date

#### Scenario: Profit calculation formula
- **WHEN** calculating profit for a payment
- **THEN** the selling price SHALL be 2500 VND per $1 USD
- **AND** the cost SHALL be 1835 VND per $1 USD
- **AND** the profit formula SHALL be: `profit = payment.credits * 665` (where 665 = 2500 - 1835)
- **AND** the result SHALL be an integer value in VND

#### Scenario: Date-based profit eligibility
- **WHEN** determining if a payment is eligible for profit calculation
- **THEN** payments SHALL use Vietnam timezone (UTC+7) for date comparison
- **AND** the cutoff datetime SHALL be `2026-01-06 20:49:00` in VN timezone
- **AND** payments with `completedAt >= cutoff` SHALL have profit calculated
- **AND** payments with `completedAt < cutoff` or `status != 'success'` SHALL have 0 profit

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
The GoProxy billing system SHALL deduct from `creditsNew` for OpenHands requests and from `credits` for OhMyGPT requests, with routing determined by model configuration rather than upstream field.

#### Scenario: OpenHands request billing
- **WHEN** a request is routed to any upstream (troll, main, or openhands)
- **AND** the model's `billing_upstream` configuration is "openhands"
- **THEN** the billing system SHALL deduct token costs from the user's `creditsNew` balance
- **AND** the billing system SHALL increment the user's `tokensUserNew` field with token usage
- **AND** the request SHALL be rejected if `creditsNew` balance is insufficient

#### Scenario: OhMyGPT request billing
- **WHEN** a request is routed to any upstream (troll, main, or openhands)
- **AND** the model's `billing_upstream` configuration is "ohmygpt"
- **THEN** the billing system SHALL deduct token costs from the user's `credits` balance
- **AND** the billing system SHALL increment the user's `creditsUsed` field with token usage
- **AND** the request SHALL be rejected if `credits` balance is insufficient

#### Scenario: Insufficient creditsNew for OpenHands
- **WHEN** a request is received for a model with `billing_upstream` = "openhands"
- **AND** the user's `creditsNew` balance is less than the request cost
- **THEN** the request SHALL be rejected with HTTP 402 Payment Required
- **AND** the error message SHALL state: "insufficient credits for request. Cost: $X.XX, Balance: $Y.YY"
- **AND** the balance SHALL reflect the `creditsNew` value

#### Scenario: Pre-request affordability check for OpenHands
- **WHEN** a request is received for a model with `billing_upstream` = "openhands"
- **THEN** the system SHALL check if `creditsNew >= estimated_request_cost` BEFORE processing
- **AND** the request SHALL be blocked if `creditsNew` is insufficient
- **AND** the system SHALL use `CanAffordRequest()` with `creditsNew` balance for validation

#### Scenario: Insufficient credits for OhMyGPT
- **WHEN** a request is received for a model with `billing_upstream` = "ohmygpt"
- **AND** the user's combined `credits` + `refCredits` balance is less than the request cost
- **THEN** the request SHALL be rejected with HTTP 402 Payment Required
- **AND** the error message SHALL state: "insufficient credits for request. Cost: $X.XX, Balance: $Y.YY"
- **AND** the balance SHALL reflect the combined `credits + refCredits` value

#### Scenario: Pre-request affordability check for OhMyGPT
- **WHEN** a request is received for a model with `billing_upstream` = "ohmygpt"
- **THEN** the system SHALL check if `credits + refCredits >= estimated_request_cost` BEFORE processing
- **AND** the request SHALL be blocked if combined balance is insufficient
- **AND** the system SHALL use `CanAffordRequest()` with combined balance for validation

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

### Requirement: Billing Upstream Configuration per Model
Each model configuration SHALL specify which credit balance to deduct from through a `billing_upstream` field that controls credit field selection independent of routing upstream.

#### Scenario: Configure billing upstream for OpenHands model
- **WHEN** a model is configured in `config.json` with `"billing_upstream": "openhands"`
- **THEN** the GoProxy SHALL use `DeductCreditsOpenHands()` for that model
- **AND** credits SHALL be deducted from the `creditsNew` field
- **AND** token usage SHALL be tracked in the `tokensUserNew` field

#### Scenario: Configure billing upstream for OhMyGPT model
- **WHEN** a model is configured in `config.json` with `"billing_upstream": "ohmygpt"`
- **THEN** the GoProxy SHALL use `DeductCreditsOhMyGPT()` for that model
- **AND** credits SHALL be deducted from the `credits` field
- **AND** token usage SHALL be tracked in the `creditsUsed` field

#### Scenario: Default billing upstream when not configured
- **WHEN** a model configuration does not include a `billing_upstream` field
- **THEN** the system SHALL default to `"ohmygpt"` for backward compatibility
- **AND** credits SHALL be deducted from the `credits` field
- **AND** a warning SHALL be logged indicating missing explicit billing_upstream configuration

#### Scenario: Invalid billing upstream value
- **WHEN** a model is configured with an invalid `billing_upstream` value (not "openhands" or "ohmygpt")
- **THEN** the configuration validation SHALL fail at startup
- **AND** an error message SHALL indicate the invalid value and list valid options
- **AND** the service SHALL refuse to start until the configuration is corrected

### Requirement: Main Target Handler Billing Routing
The main target request handlers SHALL route billing deductions to the correct credit field based on the model's `billing_upstream` configuration.

#### Scenario: Main target request with OpenHands billing upstream
- **WHEN** a request is handled by `handleMainTargetRequest()` or `handleMainTargetRequestOpenAI()`
- **AND** the model's `billing_upstream` is configured as "openhands"
- **THEN** the handler SHALL call `DeductCreditsOpenHands()`
- **AND** credits SHALL be deducted from the user's `creditsNew` balance
- **AND** the log SHALL indicate "Billing upstream: OpenHands"

#### Scenario: Main target request with OhMyGPT billing upstream
- **WHEN** a request is handled by `handleMainTargetRequest()` or `handleMainTargetRequestOpenAI()`
- **AND** the model's `billing_upstream` is configured as "ohmygpt"
- **THEN** the handler SHALL call `DeductCreditsOhMyGPT()`
- **AND** credits SHALL be deducted from the user's `credits` balance
- **AND** the log SHALL indicate "Billing upstream: OhMyGPT"

#### Scenario: Main target streaming request billing routing
- **WHEN** a streaming request is processed through main target handlers
- **AND** token usage is calculated from the streaming response
- **THEN** the billing deduction SHALL use the same `billing_upstream` routing logic
- **AND** the correct deduction function SHALL be called based on model configuration

#### Scenario: Main target cache-enabled request billing routing
- **WHEN** a request with cache tokens is processed through main target handlers
- **AND** cache write and cache hit tokens are present
- **THEN** the billing deduction SHALL include cache token costs
- **AND** the correct deduction function SHALL be called based on `billing_upstream` configuration
- **AND** OpenHands billing SHALL use the OpenHands-specific cache token handling

### Requirement: Billing Upstream Configuration Validation
The system SHALL validate billing_upstream configuration at startup and provide clear error messages for invalid configurations.

#### Scenario: Validate billing upstream field on config load
- **WHEN** the configuration file is loaded at startup
- **THEN** each model's `billing_upstream` field SHALL be validated against allowed values
- **AND** allowed values are: "openhands", "ohmygpt", or empty (defaults to "ohmygpt")
- **AND** invalid values SHALL cause startup failure with descriptive error message

#### Scenario: Log billing upstream configuration at startup
- **WHEN** the GoProxy service starts successfully
- **THEN** the system SHALL log each model's billing upstream configuration
- **AND** the log SHALL include model ID and billing_upstream value
- **AND** warnings SHALL be logged for models with default billing_upstream (missing explicit config)

