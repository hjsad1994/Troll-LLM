## ADDED Requirements

### Requirement: OpenHands Key Pool Management
The system SHALL support multiple OpenHands API keys with round-robin rotation and health monitoring, stored in MongoDB `openhands_keys` collection.

#### Scenario: Load OpenHands keys from MongoDB
- **WHEN** the server starts with `upstream: "openhands"` models configured
- **THEN** all keys from `openhands_keys` collection SHALL be loaded into the pool
- **AND** keys with status "healthy" SHALL be available for selection

#### Scenario: Round-robin key selection
- **WHEN** a request needs an OpenHands API key
- **THEN** the system SHALL select the next healthy key in rotation order
- **AND** skip keys with status "rate_limited", "exhausted", or "error"

#### Scenario: No healthy OpenHands keys available
- **WHEN** all OpenHands keys are unhealthy
- **THEN** the system SHALL return HTTP 503 Service Unavailable
- **AND** response SHALL include error "No healthy OpenHands keys available"

---

### Requirement: OpenHands Key Health Monitoring
The system SHALL monitor OpenHands key health and automatically handle failures with appropriate cooldowns.

#### Scenario: Mark key rate_limited on 429
- **WHEN** an OpenHands key receives HTTP 429 (rate limited)
- **THEN** the key SHALL be marked as "rate_limited"
- **AND** cooldown SHALL be set to 60 seconds

#### Scenario: Mark key for rotation on auth error
- **WHEN** an OpenHands key receives HTTP 401 (unauthorized) or 403 (forbidden)
- **THEN** the key SHALL be rotated immediately if backup keys available
- **OR** marked as "exhausted" if no backup keys

#### Scenario: Mark key for rotation on payment error
- **WHEN** an OpenHands key receives HTTP 402 (payment required)
- **THEN** the key SHALL be rotated immediately if backup keys available
- **OR** marked as "exhausted" if no backup keys

#### Scenario: Auto-recovery after cooldown
- **WHEN** a key's cooldown period expires
- **THEN** the key SHALL be marked as "healthy"
- **AND** included in rotation again

---

### Requirement: OpenHands Key Rotation
The system SHALL automatically rotate failed OpenHands keys using backup keys from `openhands_backup_keys` collection.

#### Scenario: Rotate key with backup available
- **WHEN** an OpenHands key needs rotation
- **AND** `openhands_backup_keys` has unused keys (`isUsed: false`)
- **THEN** the failed key SHALL be deleted from `openhands_keys`
- **AND** a backup key SHALL be inserted into `openhands_keys` with status "healthy"
- **AND** the backup key SHALL be marked as `isUsed: true`

#### Scenario: Rotation without backup
- **WHEN** an OpenHands key needs rotation
- **AND** no backup keys are available
- **THEN** the failed key SHALL be marked as "exhausted"
- **AND** a warning SHALL be logged

---

### Requirement: OpenHands Request Routing
The system SHALL route requests to OpenHands LLM Proxy when model config specifies `upstream: "openhands"`, supporting both OpenAI and Anthropic endpoints.

#### Scenario: Route OpenAI-type model to OpenHands
- **WHEN** a request is made for a model with `upstream: "openhands"` and `type: "openai"`
- **THEN** the request SHALL be forwarded to `https://llm-proxy.app.all-hands.dev/v1/chat/completions`
- **AND** the model ID SHALL be mapped using `upstream_model_id` config field
- **AND** Authorization header SHALL use the selected OpenHands key

#### Scenario: Route Anthropic-type model to OpenHands
- **WHEN** a request is made for a model with `upstream: "openhands"` and `type: "anthropic"`
- **THEN** the request SHALL be forwarded to `https://llm-proxy.app.all-hands.dev/v1/messages`
- **AND** the model ID SHALL be mapped using `upstream_model_id` config field
- **AND** Authorization header SHALL use the selected OpenHands key
- **AND** `anthropic-version` header SHALL be set to `2023-06-01`

#### Scenario: Model ID mapping
- **WHEN** client requests model `claude-sonnet-4-20250514`
- **AND** config has `upstream_model_id: "prod/claude-sonnet-4-20250514"`
- **THEN** the upstream request SHALL use model ID `prod/claude-sonnet-4-20250514`

---

### Requirement: OpenHands Request Handling
The system SHALL handle both streaming and non-streaming requests to OpenHands LLM Proxy with proper usage tracking and credit deduction.

#### Scenario: Non-streaming request
- **WHEN** a non-streaming request (`stream: false`) is made to OpenHands upstream
- **THEN** the system SHALL forward the request to OpenHands endpoint
- **AND** parse the JSON response to extract usage (input_tokens, output_tokens)
- **AND** deduct tokens from user's credit balance
- **AND** return the response to client in OpenAI format

#### Scenario: Streaming request
- **WHEN** a streaming request (`stream: true`) is made to OpenHands upstream
- **THEN** the system SHALL forward the request to OpenHands endpoint
- **AND** stream SSE events back to the client
- **AND** accumulate token usage from streaming deltas
- **AND** deduct tokens from user's credit balance after stream completes

#### Scenario: Request timeout handling
- **WHEN** OpenHands upstream does not respond within timeout (120s)
- **THEN** the system SHALL return HTTP 504 Gateway Timeout
- **AND** NOT mark the key as unhealthy (timeout is not key failure)

---

### Requirement: OpenHands Configuration Files
The system SHALL support separate configuration files for local and production OpenHands deployments.

#### Scenario: Local config file
- **WHEN** `CONFIG_PATH=config-openhands-local.json`
- **THEN** proxy SHALL run on port 8004
- **AND** route OpenHands upstream requests appropriately

#### Scenario: Production config file
- **WHEN** `CONFIG_PATH=config-openhands-prod.json`
- **THEN** proxy SHALL run on port 8004
- **AND** route OpenHands upstream requests appropriately

#### Scenario: Supported models
- **WHEN** using OpenHands config
- **THEN** the following models SHALL be available:
  - Claude Opus 4.5 (`claude-opus-4-5-20251101`)
  - Claude Opus 4 (`claude-opus-4-20250514`)
  - Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
  - Claude Sonnet 4 (`claude-sonnet-4-20250514`)
  - Claude Sonnet 3.7 (`claude-3-7-sonnet-20250219`)
  - Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
  - GPT-5 (`gpt-5-2025-08-07`)
  - GPT-5 Codex (`gpt-5-codex`)
  - Gemini 2.5 Pro (`gemini-2.5-pro`)
  - Gemini 3 Pro Preview (`gemini-3-pro-preview`)
