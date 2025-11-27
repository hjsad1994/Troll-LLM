# API Proxy Capability

## ADDED Requirements

### Requirement: User API Key Management
The system SHALL support User API keys with configurable token quotas, managed via Admin endpoints.

#### Scenario: Create new User API key
- **WHEN** admin calls `POST /admin/keys` with name, tier, and optional total_tokens
- **THEN** a new API key SHALL be generated with format `sk-{tier}-{random}`
- **AND** the key SHALL be stored in SQLite database
- **AND** default total_tokens SHALL be 30,000,000 if not specified

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

### Requirement: Two-Tier Rate Limiting
The system SHALL enforce different RPM limits based on User API key tier.

#### Scenario: Dev tier rate limit
- **WHEN** a request uses a key with prefix `sk-dev-`
- **THEN** rate limit of 30 RPM SHALL be enforced

#### Scenario: Pro tier rate limit
- **WHEN** a request uses a key with prefix `sk-pro-`
- **THEN** rate limit of 120 RPM SHALL be enforced

#### Scenario: Rate limit exceeded
- **WHEN** a user exceeds their tier's RPM limit
- **THEN** the system SHALL return HTTP 429 Too Many Requests
- **AND** include `Retry-After` header with seconds to wait
- **AND** include `X-RateLimit-Limit`, `X-RateLimit-Remaining` headers

---

### Requirement: Token Quota Enforcement
The system SHALL block users when their token quota is exhausted.

#### Scenario: Request with available quota
- **WHEN** a request is made with a key that has tokens_used < total_tokens
- **THEN** the request SHALL be processed normally

#### Scenario: Request with exhausted quota
- **WHEN** a request is made with a key that has tokens_used >= total_tokens
- **THEN** the system SHALL return HTTP 402 Payment Required
- **AND** response SHALL include error type "quota_exhausted"
- **AND** response SHALL include tokens_used and total_tokens

#### Scenario: Usage tracking after request
- **WHEN** a request completes successfully
- **THEN** tokens_used SHALL be extracted from API response (input_tokens + output_tokens)
- **AND** user_keys.tokens_used SHALL be incremented
- **AND** user_keys.requests_count SHALL be incremented

---

### Requirement: User Usage Check
The system SHALL allow users to check their token usage via API and Web UI.

#### Scenario: Check usage via API
- **WHEN** user calls `GET /api/usage?key=sk-xxx-xxx`
- **THEN** response SHALL include masked key (sk-xxx-***xxx)
- **AND** response SHALL include tier, rpm_limit, total_tokens, tokens_used, tokens_remaining
- **AND** response SHALL include usage_percent and is_exhausted flag

#### Scenario: Check usage via Web UI
- **WHEN** user visits `GET /usage`
- **THEN** a web page SHALL be displayed with input field for API key
- **AND** user can enter key to see usage with progress bar

#### Scenario: Invalid key usage check
- **WHEN** user calls `GET /api/usage` with invalid or revoked key
- **THEN** response SHALL return error "Invalid API key"

---

### Requirement: Factory Key Pool Management
The system SHALL support multiple Factory API keys with round-robin rotation and health monitoring.

#### Scenario: Load Factory keys from configuration
- **WHEN** the server starts with `factory_keys.items` configured
- **THEN** all keys SHALL be loaded into the pool with status "healthy"

#### Scenario: Round-robin selection
- **WHEN** a request needs a Factory key
- **THEN** the system SHALL select the next healthy key in rotation order
- **AND** skip keys with status "rate_limited" or "exhausted"

#### Scenario: No healthy Factory keys available
- **WHEN** all Factory keys are unhealthy
- **THEN** the system SHALL return HTTP 503 Service Unavailable
- **AND** response SHALL include error "No healthy upstream keys available"

---

### Requirement: Factory Key Health Monitoring
The system SHALL monitor Factory key health and automatically handle failures.

#### Scenario: Mark key rate_limited on 429
- **WHEN** a Factory key receives HTTP 429 (not quota exhausted)
- **THEN** the key SHALL be marked as "rate_limited"
- **AND** cooldown SHALL be set to 60 seconds

#### Scenario: Mark key exhausted on quota error
- **WHEN** a Factory key receives HTTP 429 with quota exhausted message
- **OR** HTTP 402 Payment Required
- **THEN** the key SHALL be marked as "exhausted"
- **AND** cooldown SHALL be set to 24 hours

#### Scenario: Auto-recovery after cooldown
- **WHEN** a key's cooldown period expires
- **THEN** the key SHALL be marked as "healthy"
- **AND** included in rotation again

#### Scenario: Health status in health endpoint
- **WHEN** client calls `GET /health`
- **THEN** response SHALL include factory key pool statistics
- **AND** count of healthy, rate_limited, exhausted keys

---

### Requirement: Admin Authentication
The system SHALL protect admin endpoints with secret key authentication.

#### Scenario: Valid admin authentication
- **WHEN** admin request includes header `X-Admin-Key: {secret}`
- **AND** secret matches configured `admin.secret_key`
- **THEN** request SHALL be processed

#### Scenario: Invalid admin authentication
- **WHEN** admin request has missing or invalid `X-Admin-Key` header
- **THEN** system SHALL return HTTP 401 Unauthorized

#### Scenario: Admin endpoint rate limiting
- **WHEN** more than 10 failed auth attempts from same IP in 1 minute
- **THEN** subsequent requests SHALL be blocked for 5 minutes

---

### Requirement: Streaming Token Counting
The system SHALL accurately count tokens for streaming requests.

#### Scenario: Streaming request token tracking
- **WHEN** a streaming request is made (`stream: true`)
- **THEN** the same Factory key SHALL be used for entire stream
- **AND** tokens SHALL be accumulated from streaming deltas
- **AND** usage SHALL be updated after stream completes

#### Scenario: Stream interruption handling
- **WHEN** a streaming request is interrupted
- **THEN** tokens counted up to interruption SHALL be recorded
- **AND** Factory key SHALL be released
