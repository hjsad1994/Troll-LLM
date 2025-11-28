# user-dashboard Specification

## Purpose
TBD - created by archiving change add-user-api-keys-billing. Update Purpose after archive.
## Requirements
### Requirement: User API Key Management
The system SHALL provide each user with a unique API key that can be viewed and rotated.

#### Scenario: Generate API key for new user
- **WHEN** a new user registers successfully
- **THEN** the system SHALL generate a unique API key with format `sk-trollllm-{64-char-hex}`
- **AND** store the key hash in database
- **AND** set `apiKeyCreatedAt` to current timestamp

#### Scenario: View masked API key
- **WHEN** authenticated user visits Dashboard
- **THEN** the system SHALL display API key in masked format `sk-trollllm-****...****{last4}`
- **AND** provide "Show" button to reveal full key
- **AND** provide "Copy" button to copy to clipboard

#### Scenario: Reveal full API key
- **WHEN** user clicks "Show" button on API key section
- **THEN** the system SHALL display full API key temporarily
- **AND** auto-hide after 30 seconds for security

#### Scenario: Copy API key to clipboard
- **WHEN** user clicks "Copy" button
- **THEN** the system SHALL copy full API key to clipboard
- **AND** show success toast notification

#### Scenario: Rotate API key
- **WHEN** user clicks "Rotate" button
- **AND** confirms the action in dialog
- **THEN** the system SHALL generate new API key with same format
- **AND** invalidate the old API key immediately
- **AND** display the new key (once only)
- **AND** update `apiKeyCreatedAt` to current timestamp
- **AND** show warning that old key will stop working

#### Scenario: API key rotation warning
- **WHEN** user initiates key rotation
- **THEN** the system SHALL display confirmation dialog with message:
  - "Are you sure you want to rotate your API key?"
  - "Your current key will be immediately invalidated."
  - "All applications using the current key will stop working."

---

### Requirement: User Billing Dashboard
The system SHALL display billing information including token usage and current plan.

#### Scenario: View total tokens remaining
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display total tokens remaining
- **AND** format large numbers with K/M suffixes (e.g., 1.5M)

#### Scenario: View tokens used this month
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display tokens used in current billing month
- **AND** show usage percentage as progress bar
- **AND** show reset date (first day of next month)

#### Scenario: View current plan
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display current plan with badge
- **AND** plan types are: Free, Pro, Enterprise
- **AND** show plan limits (e.g., "Free: 100K tokens/month")

#### Scenario: Monthly token usage reset
- **WHEN** new billing month starts (first day of month, 00:00 UTC)
- **THEN** the system SHALL reset `monthlyTokensUsed` to 0
- **AND** update `monthlyResetDate` to current date

---

### Requirement: User Profile API
The system SHALL provide API endpoints for user profile and API key management.

#### Scenario: Get current user info
- **WHEN** authenticated user calls `GET /api/user/me`
- **THEN** response SHALL include:
  - `username`: user's username
  - `apiKey`: masked API key (sk-trollllm-****...****)
  - `apiKeyCreatedAt`: timestamp of key creation
  - `plan`: current plan (free/pro/enterprise)
  - `totalTokens`: total token quota
  - `tokensUsed`: lifetime tokens used
  - `monthlyTokensUsed`: tokens used this month
  - `monthlyResetDate`: when monthly usage resets

#### Scenario: Get full API key
- **WHEN** authenticated user calls `GET /api/user/api-key`
- **THEN** response SHALL include full API key
- **AND** this endpoint SHALL be rate-limited to 10 requests/hour

#### Scenario: Rotate API key
- **WHEN** authenticated user calls `POST /api/user/api-key/rotate`
- **THEN** response SHALL include:
  - `newApiKey`: the new full API key (only shown once)
  - `oldKeyInvalidated`: true
  - `createdAt`: timestamp of new key

#### Scenario: Get billing info
- **WHEN** authenticated user calls `GET /api/user/billing`
- **THEN** response SHALL include:
  - `plan`: current plan name
  - `planLimits`: { monthlyTokens, features }
  - `totalTokensRemaining`: total_tokens - tokens_used
  - `monthlyTokensUsed`: tokens used this month
  - `monthlyTokensLimit`: monthly limit based on plan
  - `monthlyResetDate`: next reset date
  - `usagePercentage`: (monthlyTokensUsed / monthlyTokensLimit) * 100

---

### Requirement: API Key Format
The system SHALL use a specific format for user API keys.

#### Scenario: API key format validation
- **WHEN** validating an API key
- **THEN** the key SHALL match format: `sk-trollllm-{64-character-hex-string}`
- **AND** total length SHALL be 78 characters (11 + 1 + 64 + 1 + 64 = actually 11 + 64 = 75 chars: "sk-trollllm-" is 12 chars + 64 hex = 76 total)

#### Scenario: API key generation
- **WHEN** generating new API key
- **THEN** generate 32 bytes of cryptographically secure random data
- **AND** convert to 64-character lowercase hex string
- **AND** prepend `sk-trollllm-` prefix
- **AND** example: `sk-trollllm-4e969789b289aaaf1ec1c5ad3bd80f90dbb565691b0abae95a7e34b1d4f9b7d5`

---

### Requirement: Plan Configuration
The system SHALL support different user plans with varying token limits.

#### Scenario: Free plan limits
- **WHEN** user has plan "free"
- **THEN** monthly token limit SHALL be 0
- **AND** total token quota SHALL be 0
- **AND** RPM limit SHALL be 0

#### Scenario: Dev plan limits
- **WHEN** user has plan "dev"
- **THEN** monthly token limit SHALL be 15,000,000
- **AND** total token quota SHALL be 15,000,000
- **AND** RPM limit SHALL be 300

#### Scenario: Pro plan limits
- **WHEN** user has plan "pro"
- **THEN** monthly token limit SHALL be 40,000,000
- **AND** total token quota SHALL be 40,000,000
- **AND** RPM limit SHALL be 600

