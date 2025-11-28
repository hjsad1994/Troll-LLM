# api-proxy Specification Delta

## MODIFIED Requirements

### Requirement: User API Key Management
The system SHALL support User API keys with configurable token quotas, managed via Admin endpoints and user self-service.

#### Scenario: Create new User API key
- **WHEN** admin calls `POST /admin/keys` with name, tier, and optional total_tokens
- **THEN** a new API key SHALL be generated with format `sk-trollllm-{64-char-hex}`
- **AND** the key SHALL be stored in MongoDB database
- **AND** default total_tokens SHALL be 30,000,000 if not specified

#### Scenario: Create API key for new user registration
- **WHEN** new user registers via `POST /api/register`
- **THEN** a new API key SHALL be generated with format `sk-trollllm-{64-char-hex}`
- **AND** the key SHALL be associated with user account
- **AND** default plan SHALL be "free"

#### Scenario: User rotates own API key
- **WHEN** authenticated user calls `POST /api/user/api-key/rotate`
- **THEN** a new API key SHALL be generated with format `sk-trollllm-{64-char-hex}`
- **AND** the old API key SHALL be immediately invalidated
- **AND** the new key SHALL be returned (shown once only)
- **AND** `apiKeyCreatedAt` SHALL be updated to current timestamp

#### Scenario: List all User API keys
- **WHEN** admin calls `GET /admin/keys`
- **THEN** all keys SHALL be returned with usage statistics
- **AND** response SHALL include tokens_used, tokens_remaining, usage_percent

#### Scenario: Update User API key quota
- **WHEN** admin calls `PATCH /admin/keys/:id` with new total_tokens
- **THEN** the key's quota SHALL be updated
- **AND** tokens_remaining SHALL be recalculated

#### Scenario: Revoke User API key
- **WHEN** admin calls `DELETE /admin/keys/:id`
- **THEN** the key SHALL be marked as is_active=false (soft delete)
- **AND** subsequent requests with this key SHALL be rejected

---

## ADDED Requirements

### Requirement: Monthly Token Usage Tracking
The system SHALL track token usage per billing month and reset monthly.

#### Scenario: Track monthly usage
- **WHEN** a request is processed and tokens are consumed
- **THEN** the system SHALL increment user's `monthlyTokensUsed` counter
- **AND** update `lastUsedAt` timestamp

#### Scenario: Monthly usage reset
- **WHEN** first request of new month is made
- **AND** `monthlyResetDate` is in previous month
- **THEN** the system SHALL reset `monthlyTokensUsed` to 0
- **AND** update `monthlyResetDate` to first day of current month

#### Scenario: Query monthly usage
- **WHEN** user calls `GET /api/user/billing`
- **THEN** response SHALL include `monthlyTokensUsed` for current billing period
- **AND** include `monthlyResetDate` for next reset

---

### Requirement: User Plan Management
The system SHALL support user plans with different token limits.

#### Scenario: Default plan assignment
- **WHEN** new user registers
- **THEN** user SHALL be assigned "free" plan by default
- **AND** total_tokens SHALL be set to 500,000
- **AND** monthly_limit SHALL be set to 100,000

#### Scenario: Admin updates user plan
- **WHEN** admin calls `PATCH /admin/users/:id` with new plan
- **THEN** user's plan SHALL be updated
- **AND** token limits SHALL be updated according to plan

#### Scenario: Enforce plan limits
- **WHEN** user makes request that would exceed monthly limit
- **THEN** system SHALL return HTTP 402 Payment Required
- **AND** response SHALL include error type "monthly_quota_exhausted"
- **AND** response SHALL include next reset date
