# cache-fallback-detection Specification Delta

## MODIFIED Requirements

### Requirement: Detect OhMyGPT cache fallback events

The system SHALL detect when OhMyGPT upstream responses indicate cache tokens are missing when they should be present, track these events in a sliding window, and trigger automatic failover to GLM 4.7 when loss threshold is exceeded.

#### Scenario: Large request to cache-enabled model with no cache tokens

**Given** a user sends a request to Claude Opus 4.5 via OhMyGPT
**And** the model supports prompt caching
**And** the request contains >1024 input tokens
**When** the response usage contains `cache_read_input_tokens: 0` and `cache_creation_input_tokens: 0`
**Then** the system SHALL identify this as a cache fallback event
**And** the system SHALL record the event with timestamp and model
**And** the system SHALL log the detection
**And** the system SHALL calculate the estimated cost loss

#### Scenario: Cache fallback with loss exceeding threshold triggers GLM failover

**Given** cache fallback detection is enabled
**And** `CACHE_FAILOVER_LOSS_THRESHOLD` is set to `1.50` (USD)
**When** a cache fallback event is detected
**And** the estimated loss exceeds $1.50
**Then** the system SHALL activate failover mode for the model
**And** the system SHALL set `failover_until = now + 15 minutes`
**And** the system SHALL log: `⚠️ [Cache Failover] Loss $X.XX exceeds threshold, switching {model} to GLM for 15 minutes`

#### Scenario: Small request with no cache (not a fallback)

**Given** a user sends a request to Claude Sonnet 4.5 via OhMyGPT
**And** the request contains <1024 input tokens
**When** the response contains no cache tokens
**Then** the system SHALL NOT identify this as a cache fallback event

#### Scenario: Non-cache model with no cache tokens

**Given** a user sends a request to GPT-4 via OhMyGPT
**And** the model does not support prompt caching
**When** the response contains no cache tokens
**Then** the system SHALL NOT identify this as a cache fallback event

#### Scenario: Request with cache tokens present

**Given** a user sends a request to Claude Haiku 4.5 via OhMyGPT
**And** the request contains >1024 input tokens
**When** the response contains `cache_read_input_tokens: 5000`
**Then** the system SHALL NOT identify this as a cache fallback event

#### Scenario: Cache fallback below loss threshold does NOT trigger failover

**Given** cache fallback detection is enabled
**And** the loss threshold is $1.50
**When** a cache fallback event is detected
**And** the estimated loss is $0.75
**Then** the system SHALL NOT activate failover mode
**And** the system SHALL only record the event for email alerting

## ADDED Requirements

### Requirement: Per-model failover state management

The system SHALL maintain failover state per model to track which models are currently being redirected to GLM 4.7.

#### Scenario: Activate failover for specific model

**Given** a cache fallback event exceeds threshold for `claude-opus-4.5`
**When** failover is activated
**Then** the system SHALL set `failover_until` timestamp for `claude-opus-4.5`
**And** other models (e.g., `claude-sonnet-4.5`) SHALL remain unaffected
**And** `claude-opus-4.5` requests SHALL route to GLM for 15 minutes

#### Scenario: Check failover state during request routing

**Given** a request is received for `claude-opus-4.5`
**And** `claude-opus-4.5` is in failover mode (failover_until is in the future)
**When** `selectUpstreamConfig()` is called
**Then** the system SHALL return GLM 4.7 upstream configuration
**And** the system SHALL log: `🔄 [Failover] claude-opus-4.5 -> GLM (active until {timestamp})`

#### Scenario: Failover expires after cooldown period

**Given** `claude-opus-4.5` is in failover mode
**And** `failover_until = 10:00:00`
**When** the current time is `10:00:01`
**Then** the system SHALL clear the failover state for `claude-opus-4.5`
**And** subsequent requests SHALL route to OhMyGPT
**And** the system SHALL log: `✅ [Failover] claude-opus-4.5 cooldown expired, returning to OhMyGPT`

### Requirement: GLM 4.7 provider integration

The system SHALL implement a GLM 4.7 provider that can handle requests as a failover target when OhMyGPT cache performance is poor.

#### Scenario: GLM provider handles Anthropic format requests

**Given** a request is routed to GLM provider
**And** the request is in Anthropic Messages API format
**When** the request is forwarded to GLM
**Then** the system SHALL convert to GLM chat completions format
**And** the system SHALL map model: `claude-opus-4.5` → `glm-4.7`
**And** the system SHALL use API key from `GLM_API_KEY` environment variable
**And** the system SHALL use endpoint from `GLM_ENDPOINT` environment variable (default: `https://api.z.ai/api/paas/v4/chat/completions`)

#### Scenario: GLM provider supports streaming responses

**Given** a request is routed to GLM provider
**And** the request includes `stream: true`
**When** GLM returns streaming chunks
**Then** the system SHALL convert GLM streaming format to Anthropic format
**And** the response SHALL be compatible with existing client handlers

#### Scenario: GLM API errors do NOT trigger failover activation

**Given** a request is routed to GLM provider
**When** GLM returns an error (e.g., rate limit, 500)
**Then** the system SHALL return the error to the client
**And** the system SHALL NOT modify the failover state
**And** the system SHALL NOT activate failover for other models

### Requirement: Model name preservation in GLM responses

The system SHALL preserve the original Claude model name in responses when forwarding to GLM, ensuring users always see the model name they requested regardless of internal routing.

#### Scenario: Preserve exact model name in GLM response

**Given** a user requests model `claude-opus-4-5-20251101`
**And** the request is forwarded to GLM due to cache failover
**When** GLM returns a response with `model: "glm-4.7"`
**Then** the system SHALL rewrite the response `model` field to `claude-opus-4-5-20251101`
**And** the system SHALL preserve all other response fields unchanged

#### Scenario: Preserve model name with specific date versions

**Given** a user requests any Claude model with date suffix (e.g., `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`)
**And** the request is forwarded to GLM
**When** GLM returns the response
**Then** the system SHALL return the exact original model name in the response
**And** the system SHALL NOT replace it with GLM model names

#### Scenario: Model name preservation for streaming responses

**Given** a user requests `claude-opus-4-5-20251101` with `stream: true`
**And** the request is forwarded to GLM
**When** GLM returns streaming chunks
**Then** each streaming chunk SHALL contain the original model name `claude-opus-4-5-20251101`
**And** the final message SHALL use the original model name

#### Scenario: Add x-provider header for transparency (optional)

**Given** a request is forwarded to GLM provider
**When** the response is returned to the client
**Then** the system MAY add `x-provider: glm` header to indicate the actual provider used
**And** this header SHALL be optional and configurable

### Requirement: Automatic return to OhMyGPT after cooldown

The system SHALL automatically return to normal OhMyGPT routing after the failover cooldown period expires and resume monitoring cache performance on each subsequent request.

#### Scenario: Automatic return to OhMyGPT after cooldown expires

**Given** `claude-opus-4.5` is in failover mode
**And** `failover_until = 10:15:00`
**When** the current time is `10:15:01`
**And** a new request arrives for `claude-opus-4.5`
**Then** the system SHALL automatically clear the failover state
**And** the system SHALL route the request to OhMyGPT
**And** the system SHALL log: `✅ [Failover] claude-opus-4.5 cooldown expired, returning to OhMyGPT`
**And** the system SHALL monitor the cache response normally

#### Scenario: Cache hit after cooldown prevents re-failover

**Given** failover has expired and request is routed to OhMyGPT
**When** the response contains `cache_read_input_tokens: 5000`
**Then** the system SHALL remain in normal state
**And** the system SHALL continue routing to OhMyGPT

#### Scenario: Cache loss after cooldown triggers new failover cycle

**Given** failover has expired and request is routed to OhMyGPT
**When** the response contains no cache tokens
**And** the estimated loss exceeds $1.50
**Then** the system SHALL activate a NEW failover cycle
**And** the system SHALL set `failover_until = now + 15 minutes`
**And** the system SHALL log: `⚠️ [Cache Failover] Loss $X.XX detected, switching {model} back to GLM`

### Requirement: Failover configuration via environment variables

The system SHALL support configurable failover behavior through environment variables.

#### Scenario: Configure loss threshold

**Given** the system is starting
**When** `CACHE_FAILOVER_LOSS_THRESHOLD=2.00` is set
**Then** failover SHALL only trigger when estimated loss exceeds $2.00
**And** the default value SHALL be $1.50 if not set

#### Scenario: Configure cooldown duration

**Given** the system is starting
**When** `CACHE_FAILOVER_COOLDOWN_MINUTES=10` is set
**Then** failover duration SHALL be 10 minutes
**And** the default value SHALL be 15 minutes if not set

#### Scenario: Disable failover entirely

**Given** the system is running with failover enabled
**When** `CACHE_FAILOVER_ENABLED=false` is set
**Then** cache fallback events SHALL still be detected
**But** failover SHALL NOT be activated
**And** email alerts SHALL still be sent
