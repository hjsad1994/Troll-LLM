## ADDED Requirements

### Requirement: Friend API Key Authentication
The system SHALL authenticate Friend API Keys and route requests using the key owner's credentials and credits.

#### Scenario: Friend Key detection
- **WHEN** a request arrives with Authorization header containing API key
- **AND** the key matches format `sk-trollllm-friend-{64-char-hex}`
- **THEN** the system SHALL identify this as a Friend Key
- **AND** lookup the Friend Key record in database
- **AND** retrieve the owner's user record

#### Scenario: Valid Friend Key authentication
- **WHEN** Friend Key is found in database
- **AND** `isActive` is true
- **AND** owner's account is active
- **THEN** the system SHALL authenticate the request
- **AND** proceed with model limit validation

#### Scenario: Invalid Friend Key
- **WHEN** Friend Key is not found in database
- **OR** `isActive` is false
- **THEN** the system SHALL return HTTP 401 Unauthorized
- **AND** include error message "Invalid API key"

#### Scenario: Owner account inactive
- **WHEN** Friend Key is valid
- **AND** owner's account is inactive or deleted
- **THEN** the system SHALL return HTTP 401 Unauthorized
- **AND** include error message "API key owner account is inactive"

---

### Requirement: Friend Key Per-Model Limit Enforcement
The system SHALL enforce per-model spending limits for Friend Key requests.

#### Scenario: Check model limit before request
- **WHEN** Friend Key request arrives for a specific model
- **THEN** the system SHALL check if model is configured in `modelLimits`
- **AND** check if `usedUsd < limitUsd` for that model

#### Scenario: Model limit not configured
- **WHEN** Friend Key request is for a model not in `modelLimits`
- **OR** model's `limitUsd` is 0
- **THEN** the system SHALL return HTTP 402 Payment Required
- **AND** include error type "friend_key_model_not_allowed"
- **AND** include message "This model is not enabled for your Friend Key"

#### Scenario: Model limit exceeded
- **WHEN** Friend Key request is for a model
- **AND** `usedUsd >= limitUsd` for that model
- **THEN** the system SHALL return HTTP 402 Payment Required
- **AND** include error type "friend_key_model_limit_exceeded"
- **AND** include model name, limit, and used amount in response
- **AND** include message "Model spending limit exceeded"

#### Scenario: Model limit has budget
- **WHEN** Friend Key request is for a model
- **AND** `usedUsd < limitUsd` for that model
- **THEN** the system SHALL proceed with the request
- **AND** use owner's credits for billing

---

### Requirement: Friend Key Credit Deduction
The system SHALL deduct credits from the Friend Key owner's balance when Friend Key is used.

#### Scenario: Deduct from owner's main credits
- **WHEN** Friend Key request completes successfully
- **AND** owner has sufficient main `credits`
- **THEN** the system SHALL deduct request cost from owner's `credits`
- **AND** update `FriendKey.modelLimits[model].usedUsd`
- **AND** update `FriendKey.totalUsedUsd`
- **AND** increment `FriendKey.requestsCount`

#### Scenario: Deduct from owner's refCredits
- **WHEN** Friend Key request completes successfully
- **AND** owner's main `credits` is 0
- **AND** owner has sufficient `refCredits`
- **THEN** the system SHALL deduct request cost from owner's `refCredits`
- **AND** update Friend Key usage tracking

#### Scenario: Deduct from both credits
- **WHEN** Friend Key request costs X
- **AND** owner has Y main credits where 0 < Y < X
- **AND** owner has sufficient `refCredits` to cover (X - Y)
- **THEN** the system SHALL deduct Y from main `credits`
- **AND** deduct (X - Y) from `refCredits`
- **AND** update Friend Key usage tracking

#### Scenario: Owner has no credits
- **WHEN** Friend Key request arrives
- **AND** owner has 0 `credits` AND 0 `refCredits`
- **THEN** the system SHALL return HTTP 402 Payment Required
- **AND** include error type "owner_credits_exhausted"
- **AND** include message "API key owner has insufficient credits"

---

### Requirement: Friend Key Rate Limiting
The system SHALL apply rate limits based on the Friend Key owner's plan.

#### Scenario: Apply owner's plan RPM
- **WHEN** Friend Key request arrives
- **THEN** the system SHALL use owner's plan to determine RPM limit:
  - Free plan: 0 RPM (blocked)
  - Dev plan: 150 RPM
  - Pro plan: 300 RPM
  - Pro-Troll plan: 600 RPM

#### Scenario: Rate limit key is owner username
- **WHEN** counting requests for rate limiting
- **THEN** the system SHALL use owner's username as rate limit key
- **AND** Friend Key requests count toward owner's RPM limit
- **AND** combined with owner's main API key usage

#### Scenario: Free tier owner restriction
- **WHEN** Friend Key request arrives
- **AND** owner has "free" plan
- **THEN** the system SHALL return HTTP 403 Forbidden
- **AND** include error type "free_tier_restricted"
- **AND** include message "Friend Key owner must upgrade plan"

#### Scenario: Rate limit exceeded
- **WHEN** combined requests (main key + Friend Key) exceed owner's RPM
- **THEN** the system SHALL return HTTP 429 Too Many Requests
- **AND** include `Retry-After` header

---

### Requirement: Friend Key Usage Tracking
The system SHALL track usage statistics for Friend Key requests.

#### Scenario: Update usage after successful request
- **WHEN** Friend Key request completes successfully
- **THEN** the system SHALL update:
  - `FriendKey.modelLimits[model].usedUsd` += request cost
  - `FriendKey.totalUsedUsd` += request cost
  - `FriendKey.requestsCount` += 1
  - `FriendKey.lastUsedAt` = current timestamp

#### Scenario: Log request for Friend Key
- **WHEN** Friend Key request is processed
- **THEN** the system SHALL create request log entry with:
  - `userId`: owner's username
  - `friendKeyId`: the Friend Key ID used
  - `model`: model ID requested
  - `inputTokens`, `outputTokens`, `cacheWriteTokens`, `cacheHitTokens`
  - `creditsCost`: cost in USD
  - `statusCode`: HTTP response status
  - `latencyMs`: request duration
  - `isFriendKeyRequest`: true

#### Scenario: Query Friend Key activity
- **WHEN** user requests Friend Key activity log
- **THEN** the system SHALL return request logs where `friendKeyId` matches
- **AND** support pagination and date filtering

---

### Requirement: Friend Key Caching
The system SHALL cache Friend Key data for performance optimization.

#### Scenario: Cache Friend Key on first lookup
- **WHEN** Friend Key is looked up from database
- **THEN** the system SHALL cache the Friend Key → Owner mapping
- **AND** cache TTL SHALL be 60 seconds

#### Scenario: Invalidate cache on key rotation
- **WHEN** Friend Key is rotated or deleted
- **THEN** the system SHALL invalidate the cache entry
- **AND** subsequent requests SHALL fetch fresh data

#### Scenario: Cache miss fallback
- **WHEN** Friend Key is not in cache
- **THEN** the system SHALL query database
- **AND** cache the result for future requests
