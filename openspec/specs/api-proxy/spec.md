# api-proxy Specification

## Purpose
TBD - created by archiving change add-multi-key-proxy-rotation. Update Purpose after archive.
## Requirements
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

### Requirement: Token Quota Enforcement
The system SHALL block users when their token quota is exhausted, considering both main credits and referral credits.

#### Scenario: Request with available main credits
- **WHEN** a request is made with a key that has credits > 0
- **THEN** the request SHALL be processed normally
- **AND** deduct from main credits first

#### Scenario: Request with exhausted main credits but available refCredits
- **WHEN** a request is made with a key that has credits = 0
- **AND** refCredits > 0
- **THEN** the request SHALL be processed normally
- **AND** deduct from refCredits
- **AND** apply Pro-level RPM (1000 RPM)

#### Scenario: Request with both credits exhausted
- **WHEN** a request is made with a key that has credits = 0 AND refCredits = 0
- **THEN** the system SHALL return HTTP 402 Payment Required
- **AND** response SHALL include error type "quota_exhausted"
- **AND** response SHALL include credits, refCredits values (both 0)

#### Scenario: Usage tracking after request
- **WHEN** a request completes successfully
- **THEN** tokens_used SHALL be extracted from API response (input_tokens + output_tokens)
- **AND** deduct from appropriate credit balance (credits first, then refCredits)
- **AND** user_keys.requests_count SHALL be incremented

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

#### Scenario: Dashboard shows system metrics
- **WHEN** admin views Dashboard at root `/`
- **THEN** Dashboard SHALL display system-wide metrics (Total Requests, Total Tokens, Avg Latency, Success Rate)
- **AND** Dashboard SHALL display existing stats (User Keys, Troll-Keys, Proxies, System Health)

### Requirement: Troll-Key Pool Management
The system SHALL support multiple Troll-Keys (upstream API keys) with round-robin rotation and health monitoring.

#### Scenario: Load Troll-Keys from configuration
- **WHEN** the server starts with `troll_keys.items` configured
- **THEN** all keys SHALL be loaded into the pool with status "healthy"

#### Scenario: Round-robin selection
- **WHEN** a request needs a Troll-Key
- **THEN** the system SHALL select the next healthy key in rotation order
- **AND** skip keys with status "rate_limited" or "exhausted"

#### Scenario: No healthy Troll-Keys available
- **WHEN** all Troll-Keys are unhealthy
- **THEN** the system SHALL return HTTP 503 Service Unavailable
- **AND** response SHALL include error "No healthy upstream keys available"

---

### Requirement: Troll-Key Health Monitoring
The system SHALL monitor Troll-Key health and automatically handle failures.

#### Scenario: Mark key rate_limited on 429
- **WHEN** a Troll-Key receives HTTP 429 (not quota exhausted)
- **THEN** the key SHALL be marked as "rate_limited"
- **AND** cooldown SHALL be set to 60 seconds

#### Scenario: Mark key exhausted on quota error
- **WHEN** a Troll-Key receives HTTP 429 with quota exhausted message
- **OR** HTTP 402 Payment Required
- **THEN** the key SHALL be marked as "exhausted"
- **AND** cooldown SHALL be set to 24 hours

#### Scenario: Auto-recovery after cooldown
- **WHEN** a key's cooldown period expires
- **THEN** the key SHALL be marked as "healthy"
- **AND** included in rotation again

#### Scenario: Health status in health endpoint
- **WHEN** client calls `GET /health`
- **THEN** response SHALL include Troll-Key pool statistics
- **AND** count of healthy, rate_limited, exhausted keys

---

### Requirement: Admin Authentication
The system SHALL authenticate admin users using JWT tokens instead of session tokens.

#### Scenario: JWT Bearer authentication
- **WHEN** request includes Authorization header with "Bearer <jwt-token>"
- **THEN** verify JWT signature and expiry
- **AND** extract username and role from token payload
- **AND** allow access to protected routes based on role

#### Scenario: Basic Auth fallback (deprecated)
- **WHEN** request includes Basic Auth header
- **THEN** verify credentials against database
- **AND** allow access (backward compatibility)
- **NOTE** Basic Auth is deprecated and will be removed in future versions

### Requirement: Streaming Token Counting
The system SHALL accurately count tokens for streaming requests.

#### Scenario: Streaming request token tracking
- **WHEN** a streaming request is made (`stream: true`)
- **THEN** the same Troll-Key SHALL be used for entire stream
- **AND** tokens SHALL be accumulated from streaming deltas
- **AND** usage SHALL be updated after stream completes

#### Scenario: Stream interruption handling
- **WHEN** a streaming request is interrupted
- **THEN** tokens counted up to interruption SHALL be recorded
- **AND** Troll-Key SHALL be released

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
- **AND** key remains in troll_keys collection

### Requirement: Proxy-Based Request Routing
The system SHALL route API requests through configured proxies using round-robin selection, with support for model-based upstream routing.

#### Scenario: Request routed through proxy with model-based upstream
- **WHEN** user sends chat request
- **AND** model is configured with `upstream: "main"`
- **THEN** system routes request to `MAIN_TARGET_SERVER` using `MAIN_UPSTREAM_KEY`
- **AND** does NOT use proxy pool for `main` upstream requests

#### Scenario: Request routed through proxy with troll upstream
- **WHEN** user sends chat request
- **AND** model is configured with `upstream: "troll"` or has no upstream config
- **THEN** system selects next proxy in round-robin order
- **AND** uses primary key bound to selected proxy
- **AND** routes request through proxy to Factory AI upstream

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
- **AND** model uses `troll` upstream
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
- **AND** shows navigation to keys, troll-keys, proxies pages

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

### Requirement: Troll-Key CRUD UI
The system SHALL provide UI for managing Troll-Keys (upstream API keys), restricted to admin users only.

#### Scenario: Admin views Troll-Keys
- **WHEN** admin navigates to `/admin/troll-keys`
- **THEN** system displays all Troll-Keys with status
- **AND** shows tokens used, requests count, health status
- **AND** shows masked API key (format: `xxx***xxx`)
- **AND** does NOT show full API key value

#### Scenario: Non-admin attempts Troll-Key access
- **WHEN** non-admin user navigates to `/admin/troll-keys` or `/troll-keys`
- **THEN** system redirects to `/dashboard`
- **AND** returns HTTP 403 if API endpoint is accessed directly

#### Scenario: Admin adds Troll-Key via UI
- **WHEN** admin fills add Troll-Key form with ID and API key
- **AND** submits form
- **THEN** system creates Troll-Key
- **AND** displays full API key ONCE in response
- **AND** refreshes list showing masked key only

#### Scenario: Admin deletes Troll-Key via UI
- **WHEN** admin clicks delete on a Troll-Key
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
- **AND** selects Troll-Key and priority
- **THEN** system creates binding
- **AND** shows updated bound keys count

#### Scenario: Admin unbinds key from proxy via UI
- **WHEN** admin clicks unbind on a key binding
- **AND** confirms action
- **THEN** system removes binding
- **AND** updates proxy display

### Requirement: Rate Limit Enforcement
The system SHALL enforce rate limits based on user tier before processing API requests.

#### Scenario: Dev tier rate limit
- **WHEN** a Dev tier user makes requests exceeding 20 RPM
- **THEN** return HTTP 429 with Retry-After header

#### Scenario: Pro tier rate limit
- **WHEN** a Pro tier user makes requests exceeding 60 RPM
- **THEN** return HTTP 429 with Retry-After header

#### Scenario: Unknown user default limit
- **WHEN** a user without UserKey record makes requests exceeding 20 RPM
- **THEN** return HTTP 429 with default rate limit applied

### Requirement: Rate Limit Headers
The system SHALL include rate limit information in API response headers.

#### Scenario: Rate limit headers in response
- **WHEN** any API request is processed
- **THEN** response includes X-RateLimit-Limit, X-RateLimit-Remaining headers

#### Scenario: Retry-After on rate limit exceeded
- **WHEN** rate limit is exceeded
- **THEN** response includes Retry-After header with seconds to wait

### Requirement: System-wide Metrics API
The system SHALL provide an API endpoint to retrieve aggregated metrics for the entire proxy system.

#### Scenario: Admin retrieves system metrics
- **WHEN** admin calls `GET /admin/metrics`
- **THEN** response SHALL include total_requests count
- **AND** response SHALL include total_tokens sum
- **AND** response SHALL include avg_latency_ms (average request latency)
- **AND** response SHALL include success_rate (percentage of successful requests)

#### Scenario: Admin retrieves metrics with time period
- **WHEN** admin calls `GET /admin/metrics?period=24h`
- **THEN** response SHALL include metrics for specified period only
- **AND** valid periods are: `1h`, `24h`, `7d`, `all`
- **AND** default period is `all` if not specified

#### Scenario: No requests logged
- **WHEN** admin calls `GET /admin/metrics` with no request logs
- **THEN** response SHALL return zero values for all metrics
- **AND** success_rate SHALL be 0

---

### Requirement: Request Latency Tracking
The system SHALL track latency for each API request.

#### Scenario: Latency measured for request
- **WHEN** a request is processed through the proxy
- **THEN** latency SHALL be measured from request start to response complete
- **AND** latency SHALL be stored in `request_logs.latencyMs` field

#### Scenario: Latency included in request log
- **WHEN** request completes (success or failure)
- **THEN** request log SHALL include `latencyMs` in milliseconds
- **AND** request log SHALL include `isSuccess` boolean (true for 2xx status)

---

### Requirement: System Metrics Dashboard
The system SHALL display system-wide metrics on the admin Dashboard.

#### Scenario: Dashboard shows metrics cards
- **WHEN** admin views Dashboard page
- **THEN** page SHALL display Total Requests card
- **AND** page SHALL display Total Tokens card
- **AND** page SHALL display Avg Latency card (in ms)
- **AND** page SHALL display Success Rate card (as percentage)

#### Scenario: Dashboard auto-refreshes metrics
- **WHEN** admin is viewing Dashboard page
- **THEN** metrics SHALL auto-refresh every 30 seconds
- **AND** page SHALL not require manual reload

#### Scenario: Large numbers formatted
- **WHEN** metrics contain large values (>1000)
- **THEN** numbers SHALL be formatted with K/M suffixes
- **AND** latency SHALL show "ms" suffix
- **AND** success rate SHALL show "%" suffix

---

### Requirement: Token Analytics API
The system SHALL provide an API endpoint to retrieve token usage analytics for Troll-Keys.

#### Scenario: Get token analytics
- **WHEN** admin requests `GET /admin/troll-keys/analytics`
- **THEN** the system SHALL return token usage statistics including:
  - `tokens_1h`: Total tokens used in the last 1 hour
  - `tokens_24h`: Total tokens used in the last 24 hours  
  - `tokens_7d`: Total tokens used in the last 7 days
  - `requests_1h`: Total requests in the last 1 hour
  - `requests_24h`: Total requests in the last 24 hours
  - `requests_7d`: Total requests in the last 7 days

#### Scenario: Analytics by Troll-Key
- **WHEN** admin requests `GET /admin/troll-keys/:id/analytics`
- **THEN** the system SHALL return token usage statistics for that specific Troll-Key

### Requirement: Request Logging for Analytics
The system SHALL log each API request with timestamp and token usage for analytics aggregation.

#### Scenario: Log request with Troll-Key
- **WHEN** a request is processed through the proxy
- **THEN** the system SHALL log:
  - `trollKeyId`: The Troll-Key used
  - `userKeyId`: The user key that made the request
  - `tokensUsed`: Number of tokens consumed
  - `createdAt`: Timestamp of the request

### Requirement: Token Analytics Dashboard UI
The admin page SHALL display token usage analytics for Troll-Keys.

#### Scenario: Display analytics cards
- **WHEN** admin visits `/admin/troll-keys.html`
- **THEN** the page SHALL display analytics cards showing:
  - Tokens used in last 1 hour
  - Tokens used in last 24 hours
  - Tokens used in last 7 days

#### Scenario: Auto-refresh analytics
- **WHEN** the analytics page is open
- **THEN** the data SHALL refresh automatically every 60 seconds

### Requirement: Token Usage Database Update
The system SHALL update user token usage in the database after each API response.

#### Scenario: Update tokens after successful response
- **WHEN** an API request completes successfully
- **AND** the response contains usage information
- **THEN** the system SHALL call `usage.UpdateUsage(userApiKey, billingTokens)`
- **AND** the user's `tokensUsed` field in MongoDB SHALL be incremented

#### Scenario: Track tokens for streaming response
- **WHEN** a streaming API request completes
- **THEN** the system SHALL extract final token count from the stream
- **AND** update the database with the total tokens used

### Requirement: Token Billing Calculation
The system SHALL calculate billing tokens by applying model-specific multipliers to raw token usage.

#### Scenario: Opus model billing
- **WHEN** a request uses model `claude-opus-4-5-20251101`
- **AND** the response contains `input_tokens: 100` and `output_tokens: 200`
- **THEN** billing tokens SHALL be calculated as:
  - `billing_input_tokens: 120` (100 * 1.2)
  - `billing_output_tokens: 240` (200 * 1.2)

#### Scenario: Sonnet model billing
- **WHEN** a request uses model `claude-sonnet-4-5-20250929`
- **AND** the response contains `input_tokens: 100` and `output_tokens: 200`
- **THEN** billing tokens SHALL be calculated as:
  - `billing_input_tokens: 120` (100 * 1.2)
  - `billing_output_tokens: 240` (200 * 1.2)

#### Scenario: Haiku model billing
- **WHEN** a request uses model `claude-haiku-4-5-20251001`
- **AND** the response contains `input_tokens: 100` and `output_tokens: 200`
- **THEN** billing tokens SHALL be calculated as:
  - `billing_input_tokens: 40` (100 * 0.4)
  - `billing_output_tokens: 80` (200 * 0.4)

### Requirement: Billing Token Response
The system SHALL include billing token information in API responses.

#### Scenario: Non-streaming response with billing
- **WHEN** a non-streaming request completes successfully
- **THEN** the response usage object SHALL contain:
  - `prompt_tokens` (raw input tokens)
  - `completion_tokens` (raw output tokens)
  - `billing_prompt_tokens` (multiplied input tokens)
  - `billing_completion_tokens` (multiplied output tokens)

#### Scenario: Streaming response with billing
- **WHEN** a streaming request completes
- **THEN** the final usage information SHALL include billing tokens

### Requirement: Model Multiplier Configuration
The system SHALL support configurable token multipliers per model.

#### Scenario: Multiplier from config
- **WHEN** a model is configured with `"token_multiplier": 1.2`
- **THEN** all token calculations for that model SHALL use 1.2 as multiplier

#### Scenario: Default multiplier
- **WHEN** a model has no configured multiplier
- **THEN** the system SHALL use 1.0 as default multiplier

### Requirement: User Registration
The system SHALL allow new users to register with username and password.

#### Scenario: Successful registration
- **WHEN** POST request to `/api/register` with valid username (3-50 chars) and password (min 6 chars)
- **THEN** create new user with hashed password and role (default: user)
- **AND** return JWT access token with 24h expiry

#### Scenario: Registration with existing username
- **WHEN** POST request to `/api/register` with username that already exists
- **THEN** return 409 Conflict with error message "Username already exists"

#### Scenario: Registration with invalid input
- **WHEN** POST request to `/api/register` with invalid username or password
- **THEN** return 400 Bad Request with validation error details

### Requirement: User Login
The system SHALL authenticate users and return JWT tokens.

#### Scenario: Successful login
- **WHEN** POST request to `/api/login` with valid credentials
- **THEN** return JWT access token with username and role
- **AND** update user's lastLoginAt timestamp

#### Scenario: Login with invalid credentials
- **WHEN** POST request to `/api/login` with invalid username or password
- **THEN** return 401 Unauthorized with error message "Invalid credentials"

#### Scenario: Login with inactive user
- **WHEN** POST request to `/api/login` with inactive user account
- **THEN** return 401 Unauthorized with error message "Invalid credentials"

### Requirement: JWT Authentication Middleware
The system SHALL verify JWT tokens on protected routes.

#### Scenario: Valid JWT token
- **WHEN** request with valid Bearer token in Authorization header
- **THEN** attach user info (username, role) to request and proceed

#### Scenario: Expired JWT token
- **WHEN** request with expired JWT token
- **THEN** return 401 Unauthorized with error message "Token expired"

#### Scenario: Invalid JWT token
- **WHEN** request with invalid or malformed JWT token
- **THEN** return 401 Unauthorized with error message "Invalid token"

#### Scenario: Missing Authorization header
- **WHEN** request to protected route without Authorization header
- **THEN** return 401 Unauthorized with error message "Authentication required"

### Requirement: Role-Based Authorization
The system SHALL enforce role-based access control on admin endpoints.

#### Scenario: Admin accessing admin endpoints
- **WHEN** user with role "admin" accesses any admin endpoint
- **THEN** allow access and process request

#### Scenario: User accessing read-only endpoints
- **WHEN** user with role "user" accesses GET endpoints under /admin
- **THEN** allow access and return data

#### Scenario: User accessing write endpoints
- **WHEN** user with role "user" attempts POST/PATCH/DELETE on /admin endpoints
- **THEN** return 403 Forbidden with error message "Insufficient permissions"

### Requirement: Layered Architecture
The backend SHALL follow layered architecture pattern.

#### Scenario: Controller layer handles HTTP
- **WHEN** HTTP request arrives at controller
- **THEN** controller validates input using DTOs
- **AND** delegates to service layer for business logic
- **AND** formats response to client

#### Scenario: Service layer handles business logic
- **WHEN** service method is called
- **THEN** execute business rules and validations
- **AND** call repository for data operations
- **AND** return result without HTTP concerns

#### Scenario: Repository layer handles data access
- **WHEN** repository method is called
- **THEN** interact with MongoDB via Mongoose models
- **AND** return domain entities

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

### Requirement: Troll-Key Backend Isolation
The system SHALL ensure Troll-Keys (upstream API keys) remain completely hidden from non-admin users and are never exposed in API responses.

#### Scenario: Non-admin user attempts to access Troll-Keys endpoint
- **WHEN** a user with role "user" calls `GET /admin/troll-keys`
- **THEN** the system SHALL return HTTP 403 Forbidden
- **AND** response SHALL include error message "Insufficient permissions"

#### Scenario: Admin user lists Troll-Keys
- **WHEN** a user with role "admin" calls `GET /admin/troll-keys`
- **THEN** the system SHALL return Troll-Key metadata
- **AND** the `apiKey` field SHALL be excluded from the response
- **AND** a `maskedApiKey` field SHALL be included showing format `xxx***xxx`

#### Scenario: Troll-Key creation returns full key once
- **WHEN** admin calls `POST /admin/troll-keys` with valid data
- **THEN** the full `apiKey` value SHALL be returned in the response
- **AND** subsequent GET requests SHALL NOT include the full `apiKey`
- **AND** response SHALL include warning "Save this key - it will not be shown again"

#### Scenario: API response never contains full Troll-Key
- **WHEN** any API endpoint returns Troll-Key data
- **AND** the request is not a POST (creation)
- **THEN** the response SHALL NOT include the full `apiKey` field
- **AND** MongoDB projection SHALL exclude `apiKey` at query time

---

### Requirement: Troll-Key UI Admin-Only Access
The system SHALL restrict Troll-Key management UI to admin users only.

#### Scenario: Non-admin navigates to troll-keys page
- **WHEN** a user with role "user" navigates to `/troll-keys`
- **THEN** the system SHALL redirect to `/dashboard`
- **AND** Troll-Key management UI SHALL NOT be rendered

#### Scenario: Admin accesses troll-keys page
- **WHEN** a user with role "admin" navigates to `/troll-keys`
- **THEN** the system SHALL display the Troll-Key management UI
- **AND** keys SHALL be displayed with masked API key values

#### Scenario: User dashboard excludes Troll-Keys
- **WHEN** a user with role "user" views their dashboard
- **THEN** the dashboard SHALL NOT display Troll-Key information
- **AND** the dashboard SHALL NOT fetch Troll-Key endpoints

#### Scenario: Admin dashboard shows Troll-Keys
- **WHEN** a user with role "admin" views the admin dashboard
- **THEN** the dashboard MAY display Troll-Key summary (count, health)
- **AND** Troll-Key API values SHALL be masked

---

### Requirement: Model-Based Upstream Routing
The system SHALL route API requests to different upstream providers based on the requested model.

#### Scenario: Sonnet 4.5 routed to Main Target
- **WHEN** a request is made with model `claude-sonnet-4-5-20250929`
- **THEN** the system SHALL route the request to `MAIN_TARGET_SERVER` endpoint
- **AND** use `MAIN_UPSTREAM_KEY` for authentication
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Haiku 4.5 routed to Main Target
- **WHEN** a request is made with model `claude-haiku-4-5-20251001`
- **THEN** the system SHALL route the request to `MAIN_TARGET_SERVER` endpoint
- **AND** use `MAIN_UPSTREAM_KEY` for authentication
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Opus 4.5 routed to Troll Key
- **WHEN** a request is made with model `claude-opus-4-5-20251101`
- **THEN** the system SHALL route the request to Factory AI (troll-key pool)
- **AND** use existing proxy pool and troll-key rotation
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Fallback to Troll Key for unknown upstream
- **WHEN** a model has no `upstream` configuration
- **THEN** the system SHALL default to using Troll Key (Factory AI)

---

### Requirement: Upstream Configuration
The system SHALL support configuration of multiple upstream providers per model.

#### Scenario: Model config includes upstream field
- **WHEN** a model is defined in `config.json`
- **THEN** the model MAY include an `upstream` field with value `troll` or `main`
- **AND** `troll` indicates Factory AI via troll-key pool
- **AND** `main` indicates external provider via `MAIN_TARGET_SERVER`

#### Scenario: Main Target endpoint configuration
- **WHEN** `MAIN_TARGET_SERVER` environment variable is set
- **THEN** the system SHALL use this URL as the base endpoint for `main` upstream
- **AND** append `/v1/messages` path for Anthropic requests

#### Scenario: Main Upstream Key configuration
- **WHEN** `MAIN_UPSTREAM_KEY` environment variable is set
- **THEN** the system SHALL use this key for authentication with Main Target
- **AND** key SHALL be sent as `Bearer` token in Authorization header

---

### Requirement: Upstream Selection Logging
The system SHALL log upstream selection for debugging and monitoring.

#### Scenario: Log upstream selection
- **WHEN** a request is routed to an upstream provider
- **THEN** the system SHALL log which upstream was selected (`main` or `troll`)
- **AND** include model ID in the log message

### Requirement: Public API Endpoint Documentation
The system SHALL document `https://chat.trollllm.xyz` as the primary LLM API endpoint for all client integrations.

#### Scenario: OpenAI SDK Configuration
- **WHEN** user configures OpenAI SDK
- **THEN** base_url SHALL be `https://chat.trollllm.xyz/v1`

#### Scenario: Anthropic SDK Configuration
- **WHEN** user configures Anthropic SDK
- **THEN** base_url SHALL be `https://chat.trollllm.xyz`

#### Scenario: Direct API Calls
- **WHEN** user makes direct curl/HTTP requests
- **THEN** endpoint SHALL be `https://chat.trollllm.xyz/v1/chat/completions` for OpenAI format
- **AND** endpoint SHALL be `https://chat.trollllm.xyz/v1/messages` for Anthropic format

### Requirement: Upstream Error Sanitization
The system SHALL sanitize error responses from upstream providers before returning them to clients, preventing exposure of sensitive backend infrastructure details.

#### Scenario: Sanitize 402 Payment Required error
- **WHEN** upstream returns HTTP 402 with details like `{"detail":"Ready for more? Reload your tokens at https://app.factory.ai/settings/billing...","requestId":"..."}`
- **THEN** the system SHALL log original error server-side for debugging
- **AND** return sanitized response `{"error":{"message":"Payment required","type":"payment_error"}}` to client
- **AND** NOT expose upstream URLs, request IDs, or billing links

#### Scenario: Sanitize 429 Rate Limit error
- **WHEN** upstream returns HTTP 429 with provider-specific details
- **THEN** the system SHALL return sanitized response `{"error":{"message":"Rate limit exceeded","type":"rate_limit_error"}}`
- **AND** NOT expose upstream rate limit details or retry hints

#### Scenario: Sanitize 401 Authentication error
- **WHEN** upstream returns HTTP 401 with authentication details
- **THEN** the system SHALL return sanitized response `{"error":{"message":"Authentication failed","type":"authentication_error"}}`
- **AND** NOT expose upstream authentication mechanism details

#### Scenario: Sanitize 5xx Server errors
- **WHEN** upstream returns HTTP 500, 502, 503, or 504
- **THEN** the system SHALL return sanitized response `{"error":{"message":"Upstream service unavailable","type":"server_error"}}`
- **AND** NOT expose upstream server details or stack traces

#### Scenario: Sanitize Anthropic format errors
- **WHEN** upstream returns error in Anthropic format and client expects Anthropic format
- **THEN** the system SHALL return sanitized response in Anthropic format: `{"type":"error","error":{"type":"<error_type>","message":"<generic_message>"}}`

#### Scenario: Server-side error logging
- **WHEN** any upstream error is sanitized
- **THEN** the original error response SHALL be logged with prefix `🔒 [Handler] Original error (hidden):`
- **AND** include full upstream response body for debugging

### Requirement: Referral Credits Field
The system SHALL support a separate `refCredits` field for referral bonus credits.

#### Scenario: User has refCredits balance
- **WHEN** a user has been awarded referral credits
- **THEN** the user record SHALL include `refCredits` field (default: 0)
- **AND** `refCredits` is separate from main `credits` balance

---

### Requirement: Credit Deduction Priority
The system SHALL use main credits first, then referral credits when main credits are exhausted.

#### Scenario: Deduct from main credits when available
- **WHEN** user makes API request costing X credits
- **AND** user has sufficient main `credits` balance (credits >= X)
- **THEN** the system SHALL deduct X from main `credits`
- **AND** NOT touch `refCredits`
- **AND** apply user's plan RPM limit (Dev: 300 RPM, Pro: 1000 RPM)

#### Scenario: Deduct from refCredits when main credits exhausted
- **WHEN** user makes API request costing X credits
- **AND** user's main `credits` balance is 0
- **AND** user has sufficient `refCredits` balance (refCredits >= X)
- **THEN** the system SHALL deduct X from `refCredits`
- **AND** apply **Pro-level RPM (1000 RPM)** for this request regardless of user's plan

#### Scenario: Deduct from both credits (partial)
- **WHEN** user makes API request costing X credits
- **AND** user has Y main credits where 0 < Y < X
- **AND** user has sufficient `refCredits` to cover (X - Y)
- **THEN** the system SHALL deduct Y from main `credits` (reducing to 0)
- **AND** deduct (X - Y) from `refCredits`
- **AND** apply **Pro-level RPM (1000 RPM)** for this request

#### Scenario: Reject request when no credits available
- **WHEN** user makes API request
- **AND** user has 0 main `credits` AND 0 `refCredits`
- **THEN** the system SHALL reject the request with HTTP 402 Payment Required
- **AND** response SHALL include error type "insufficient_credits"

---

### Requirement: Pro-Level RPM for Referral Credits
The system SHALL apply Pro-level rate limits when user is consuming referral credits.

#### Scenario: Apply Pro RPM when using refCredits only
- **WHEN** user makes API request
- **AND** credits are deducted from `refCredits` (main credits = 0)
- **THEN** the system SHALL apply 1000 RPM rate limit for this request
- **AND** ignore user's plan-based RPM limit for this request

#### Scenario: Apply Pro RPM when using mixed credits
- **WHEN** user makes API request
- **AND** credits are deducted from both main `credits` AND `refCredits`
- **THEN** the system SHALL apply 1000 RPM rate limit for this request

#### Scenario: Apply plan RPM when using main credits only
- **WHEN** user makes API request
- **AND** credits are deducted only from main `credits`
- **AND** `refCredits` is not touched
- **THEN** the system SHALL apply user's plan-based RPM limit (Dev: 300, Pro: 1000)

---

