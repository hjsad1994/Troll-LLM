## ADDED Requirements

### Requirement: Free Tier Access Restriction
The system SHALL block Free Tier users from accessing the API proxy.

#### Scenario: Free Tier user attempts API request
- **WHEN** a request is made with an API key belonging to a Free Tier user
- **THEN** the system SHALL return HTTP 403 Forbidden
- **AND** response SHALL include error type "free_tier_restricted"
- **AND** response SHALL include message "Free Tier users cannot access this API. Please upgrade your plan."

#### Scenario: Free Tier check before rate limiting
- **WHEN** validating an incoming API request
- **THEN** Free Tier check SHALL be performed before rate limit check
- **AND** Free Tier check SHALL be performed before quota check

---

### Requirement: Model Pricing Configuration
The system SHALL support configurable pricing per model for billing calculations.

#### Scenario: Store model pricing in database
- **WHEN** model pricing is configured
- **THEN** the system SHALL store pricing in `model_pricing` collection with fields:
  - `modelId`: unique model identifier (e.g., "claude-sonnet-4-5")
  - `displayName`: human-readable name
  - `inputPricePerMTok`: price per million input tokens in USD
  - `outputPricePerMTok`: price per million output tokens in USD
  - `isActive`: whether this pricing is active
  - `updatedAt`: last modification timestamp

#### Scenario: Default model pricing
- **WHEN** the system is initialized
- **THEN** default pricing SHALL be configured:
  - Claude Sonnet 4.5: Input $3/MTok, Output $15/MTok
  - Claude Haiku 4.5: Input $1/MTok, Output $5/MTok
  - Claude Opus 4.5: Input $5/MTok, Output $25/MTok

#### Scenario: Calculate billing cost
- **WHEN** a request completes with token usage
- **THEN** billing cost SHALL be calculated as:
  - `inputCost = (input_tokens / 1,000,000) * inputPricePerMTok`
  - `outputCost = (output_tokens / 1,000,000) * outputPricePerMTok`
  - `totalCost = inputCost + outputCost`

---

### Requirement: Admin Pricing Management API
The system SHALL provide API endpoints for administrators to manage model pricing.

#### Scenario: List all model pricing
- **WHEN** admin calls `GET /admin/pricing`
- **THEN** response SHALL include all model pricing configurations
- **AND** response SHALL include `total` count

#### Scenario: Get specific model pricing
- **WHEN** admin calls `GET /admin/pricing/:modelId`
- **THEN** response SHALL include pricing for that model
- **OR** return 404 if model not found

#### Scenario: Update model pricing
- **WHEN** admin calls `PUT /admin/pricing/:modelId` with new prices
- **THEN** the pricing SHALL be updated
- **AND** `updatedAt` SHALL be set to current timestamp
- **AND** only admin role users can perform this action

#### Scenario: Create new model pricing
- **WHEN** admin calls `POST /admin/pricing` with model details
- **THEN** new pricing record SHALL be created
- **AND** only admin role users can perform this action

#### Scenario: Non-admin access denied
- **WHEN** a non-admin user attempts to modify pricing
- **THEN** return HTTP 403 Forbidden

---

## MODIFIED Requirements

### Requirement: Two-Tier Rate Limiting
The system SHALL enforce different RPM limits based on User API key tier.

#### Scenario: Free tier rate limit
- **WHEN** a request uses a Free tier API key
- **THEN** the request SHALL be rejected with HTTP 403
- **AND** error type SHALL be "free_tier_restricted"

#### Scenario: Dev tier rate limit
- **WHEN** a request uses a Dev tier API key
- **THEN** rate limit of 300 RPM SHALL be enforced

#### Scenario: Pro tier rate limit
- **WHEN** a request uses a Pro tier API key
- **THEN** rate limit of 1000 RPM SHALL be enforced

#### Scenario: Rate limit exceeded
- **WHEN** a user exceeds their tier's RPM limit
- **THEN** the system SHALL return HTTP 429 Too Many Requests
- **AND** include `Retry-After` header with seconds to wait
- **AND** include `X-RateLimit-Limit`, `X-RateLimit-Remaining` headers
