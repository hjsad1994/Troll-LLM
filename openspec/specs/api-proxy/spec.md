# api-proxy Specification

## Purpose
TBD - created by archiving change add-multi-key-proxy-rotation. Update Purpose after archive.
## Requirements
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

### Requirement: Proxy Management
The system SHALL support multiple proxy servers (HTTP and SOCKS5) for routing API requests to upstream providers.

#### Scenario: Admin creates HTTP proxy
- **WHEN** admin sends POST /admin/proxies with type "http", host, and port
- **THEN** system creates proxy record with status "healthy"
- **AND** returns proxy details with generated ID

#### Scenario: Admin creates SOCKS5 proxy with auth
- **WHEN** admin sends POST /admin/proxies with type "socks5", host, port, username, password
- **THEN** system creates proxy record with encrypted credentials
- **AND** returns proxy details without exposing password

#### Scenario: Admin tests proxy connectivity
- **WHEN** admin sends POST /admin/proxies/:id/test
- **THEN** system attempts connection through proxy
- **AND** returns success/failure status with latency

#### Scenario: Admin deletes proxy with bindings
- **WHEN** admin sends DELETE /admin/proxies/:id for proxy with key bindings
- **THEN** system removes all key bindings
- **AND** deletes proxy record

### Requirement: Proxy-Key Binding
The system SHALL support binding 1-2 Factory API keys to each proxy server.

#### Scenario: Admin binds primary key to proxy
- **WHEN** admin sends POST /admin/proxies/:id/keys with factoryKeyId and priority 1
- **THEN** system creates binding with priority 1 (primary)
- **AND** key is used as first choice for this proxy

#### Scenario: Admin binds secondary key to proxy
- **WHEN** admin sends POST /admin/proxies/:id/keys with factoryKeyId and priority 2
- **THEN** system creates binding with priority 2 (secondary)
- **AND** key is used as fallback when primary fails

#### Scenario: Reject third key binding
- **WHEN** admin attempts to bind third key to proxy (already has 2 bindings)
- **THEN** system returns error "Maximum 2 keys per proxy"

#### Scenario: Admin unbinds key from proxy
- **WHEN** admin sends DELETE /admin/proxies/:id/keys/:keyId
- **THEN** system removes binding
- **AND** key remains in factory_keys collection

### Requirement: Proxy-Based Request Routing
The system SHALL route API requests through configured proxies using round-robin selection.

#### Scenario: Request routed through proxy
- **WHEN** user sends chat request
- **AND** proxies are configured
- **THEN** system selects next proxy in round-robin order
- **AND** uses primary key bound to selected proxy
- **AND** routes request through proxy to upstream

#### Scenario: Primary key rate limited
- **WHEN** request fails with 429 (rate limit) using primary key
- **AND** proxy has secondary key bound
- **THEN** system retries with secondary key on same proxy

#### Scenario: Both keys exhausted on proxy
- **WHEN** both primary and secondary keys on proxy return 429/402
- **THEN** system marks proxy as temporarily unhealthy
- **AND** selects next healthy proxy
- **AND** retries request

#### Scenario: All proxies exhausted
- **WHEN** all configured proxies are unhealthy or exhausted
- **THEN** system returns 503 Service Unavailable
- **AND** includes retry-after header

#### Scenario: No proxies configured (direct mode)
- **WHEN** no proxies are configured in database
- **THEN** system uses direct connection (existing behavior)
- **AND** uses keypool without proxy routing

### Requirement: Proxy Health Monitoring
The system SHALL continuously monitor proxy health and log status changes.

#### Scenario: Health check runs periodically
- **WHEN** system is running
- **THEN** health check runs every 30 seconds for each proxy
- **AND** tests TCP connection and HTTP request through proxy
- **AND** records latency and status to `proxy_health_logs`

#### Scenario: Proxy marked unhealthy after consecutive failures
- **WHEN** proxy fails health check 3 times consecutively
- **THEN** system marks proxy status as "unhealthy"
- **AND** excludes proxy from round-robin selection

#### Scenario: Proxy recovered after being unhealthy
- **WHEN** unhealthy proxy passes health check
- **THEN** system marks proxy status as "healthy"
- **AND** includes proxy back in round-robin selection

### Requirement: Status Dashboard
The system SHALL provide a public status page showing proxy health.

#### Scenario: User views status dashboard
- **WHEN** user visits /status page
- **THEN** system displays overall health status
- **AND** shows each proxy with status, latency, key count
- **AND** auto-refreshes every 30 seconds

#### Scenario: Status API returns JSON
- **WHEN** client calls GET /api/status
- **THEN** system returns JSON with overall status and proxy details
- **AND** includes last check timestamp

### Requirement: Admin Dashboard
The system SHALL provide a web-based admin dashboard for managing keys and proxies.

#### Scenario: Admin accesses dashboard
- **WHEN** admin navigates to /admin
- **AND** is authenticated
- **THEN** system displays dashboard with overview stats
- **AND** shows navigation to keys, factory-keys, proxies pages

#### Scenario: Unauthenticated access redirects to login
- **WHEN** unauthenticated user navigates to /admin/*
- **THEN** system redirects to login page
- **AND** stores original URL for redirect after login

### Requirement: User Keys CRUD UI
The system SHALL provide UI for managing user API keys.

#### Scenario: Admin views keys list
- **WHEN** admin navigates to /admin/keys
- **THEN** system displays all user keys in table
- **AND** shows key ID (masked), name, tier, usage, status

#### Scenario: Admin creates new key via UI
- **WHEN** admin fills create key form with name, tier, token limit
- **AND** submits form
- **THEN** system creates key and displays full key ID once
- **AND** refreshes keys list

#### Scenario: Admin edits key via UI
- **WHEN** admin clicks edit on a key
- **THEN** system shows modal with editable fields
- **AND** allows updating quota and notes

#### Scenario: Admin revokes key via UI
- **WHEN** admin clicks revoke on a key
- **AND** confirms action
- **THEN** system revokes key
- **AND** updates list to show revoked status

### Requirement: Factory Keys CRUD UI
The system SHALL provide UI for managing factory API keys.

#### Scenario: Admin views factory keys
- **WHEN** admin navigates to /admin/factory-keys
- **THEN** system displays all factory keys with status
- **AND** shows tokens used, requests count, health status

#### Scenario: Admin adds factory key via UI
- **WHEN** admin fills add factory key form with ID and API key
- **AND** submits form
- **THEN** system creates factory key
- **AND** refreshes list

#### Scenario: Admin deletes factory key via UI
- **WHEN** admin clicks delete on a factory key
- **AND** confirms action
- **THEN** system deletes key and all bindings
- **AND** refreshes list

### Requirement: Proxies CRUD UI
The system SHALL provide UI for managing proxies and key bindings.

#### Scenario: Admin views proxies list
- **WHEN** admin navigates to /admin/proxies
- **THEN** system displays all proxies with health status
- **AND** shows name, type, host:port, latency, bound keys count

#### Scenario: Admin creates proxy via UI
- **WHEN** admin fills create proxy form
- **AND** submits form
- **THEN** system creates proxy
- **AND** refreshes list

#### Scenario: Admin binds key to proxy via UI
- **WHEN** admin selects proxy and clicks "Bind Key"
- **AND** selects factory key and priority
- **THEN** system creates binding
- **AND** shows updated bound keys count

#### Scenario: Admin unbinds key from proxy via UI
- **WHEN** admin clicks unbind on a key binding
- **AND** confirms action
- **THEN** system removes binding
- **AND** updates proxy display

