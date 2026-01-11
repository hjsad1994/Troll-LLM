## ADDED Requirements

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

## MODIFIED Requirements

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
