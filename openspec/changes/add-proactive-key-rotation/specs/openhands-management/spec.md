## ADDED Requirements

### Requirement: Proactive Key Rotation
The system SHALL proactively rotate OpenHands keys when estimated spend reaches 96% of the configured budget limit, preventing user-facing failures due to budget exhaustion.

#### Scenario: Proactive rotation before request
- **WHEN** a request is about to be sent and the selected key's `spendEstimate` >= 96% of `budgetLimit`
- **THEN** the system rotates to a backup key before sending the request
- **AND** logs the proactive rotation with prefix `🔮 [OpenHands/ProactiveRotation]`

#### Scenario: Fallback to reactive rotation
- **WHEN** proactive rotation is not triggered but the request fails with ExceededBudget error
- **THEN** the system falls back to reactive rotation (existing behavior)

#### Scenario: No backup keys available for proactive rotation
- **WHEN** spend threshold is reached but no backup keys are available
- **THEN** the system continues with the current key and logs a warning
- **AND** relies on reactive rotation if the request fails

### Requirement: Spend Tracking
The system SHALL track estimated spend per OpenHands key by calculating cost from token usage after each successful request.

#### Scenario: Update spend after successful request
- **WHEN** a request completes successfully with usage data (input_tokens, output_tokens, cache_write_tokens, cache_read_tokens)
- **THEN** the system calculates cost using model-specific pricing from config
- **AND** adds the cost to the key's `spendEstimate` field in both memory and MongoDB

#### Scenario: Cost calculation using config pricing
- **WHEN** calculating cost for a request
- **THEN** the system uses pricing from `config-openhands-prod.json` (per 1M tokens):
  - claude-opus-4-5-20251101: $5.0 input, $25.0 output, $6.25 cache_write, $0.5 cache_hit
  - claude-sonnet-4-5-20250929: $3.0 input, $15.0 output, $3.75 cache_write, $0.3 cache_hit
  - claude-haiku-4-5-20251001: $1.0 input, $5.0 output, $1.25 cache_write, $0.1 cache_hit
  - Other models: use their respective pricing from config

#### Scenario: Calibrate spend from error response
- **WHEN** receiving ExceededBudget error with message containing `Spend=X.XX`
- **THEN** the system parses the actual spend value
- **AND** updates `spendEstimate` to the parsed value for accurate future tracking

### Requirement: Budget Configuration
The system SHALL allow configuring budget limits and spend estimates per OpenHands key via admin API.

#### Scenario: Set budget limit
- **WHEN** an admin sends PATCH `/admin/openhands/keys/:id/budget` with `{budgetLimit: 10.0}`
- **THEN** the system updates the key's `budgetLimit` field

#### Scenario: Set initial spend estimate
- **WHEN** an admin sends PATCH `/admin/openhands/keys/:id/spend` with `{spendEstimate: 4.5}`
- **THEN** the system updates the key's `spendEstimate` field
- **AND** this allows calibrating spend tracking for existing keys that have already been used

#### Scenario: Default budget limit
- **WHEN** a new OpenHands key is created without explicit budgetLimit
- **THEN** the system sets `budgetLimit` to 10.0 (dollars)
- **AND** sets `spendEstimate` to 0.0

#### Scenario: View spend status
- **WHEN** an admin requests GET `/admin/openhands/keys`
- **THEN** the response includes `spendEstimate`, `budgetLimit`, and `spendPercentage` for each key

## MODIFIED Requirements

### Requirement: OpenHands Keys CRUD
The system SHALL provide full CRUD operations for OpenHands keys stored in the `openhands_keys` MongoDB collection, accessible via `/admin/openhands/keys` endpoints.

#### Scenario: List all OpenHands keys
- **WHEN** an admin requests GET `/admin/openhands/keys`
- **THEN** the system returns all keys from `openhands_keys` collection with stats (totalKeys, healthyKeys)
- **AND** includes `spendEstimate`, `budgetLimit`, and `spendPercentage` for each key

#### Scenario: Create new OpenHands key
- **WHEN** an admin posts to `/admin/openhands/keys` with `{id, apiKey}`
- **THEN** the system creates a new key in `openhands_keys` collection with status 'healthy', tokensUsed 0, requestsCount 0
- **AND** sets `spendEstimate` to 0.0 and `budgetLimit` to 10.0

#### Scenario: Delete OpenHands key
- **WHEN** an admin sends DELETE `/admin/openhands/keys/:id`
- **THEN** the system deletes the key from `openhands_keys` and all associated bindings from `openhands_bindings`

#### Scenario: Reset OpenHands key stats
- **WHEN** an admin posts to `/admin/openhands/keys/:id/reset`
- **THEN** the system resets status to 'healthy', tokensUsed to 0, requestsCount to 0, and clears lastError and cooldownUntil
- **AND** resets `spendEstimate` to 0.0
