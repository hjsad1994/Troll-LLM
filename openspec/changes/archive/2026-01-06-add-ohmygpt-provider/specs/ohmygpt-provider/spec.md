# Spec: OhMyGPT Provider

## Overview

OhMyGPT provider enables TrollLLM to route LLM requests through the OhMyGPT API endpoint (`https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`) as an alternative to OpenHands. It provides the same key pool management, rotation logic, and retry mechanisms.

## ADDED Requirements

### Requirement: Provider Initialization

The system SHALL initialize the OhMyGPT provider on startup with configuration loaded from JSON files.

#### Scenario: Load development configuration

**Given** the system starts in development mode
**When** the OhMyGPT provider is configured
**Then** it should load `config-ohmygpt-dev.json`
**And** set the endpoint to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`
**And** load model aliases for Claude 4.5 models

#### Scenario: Load production configuration

**Given** the system starts in production mode
**When** the OhMyGPT provider is configured
**Then** it should load `config-ohmygpt-prod.json`
**And** apply production billing multipliers
**And** configure production user agent

### Requirement: API Key Pool Management

The system SHALL maintain a separate pool of OhMyGPT API keys in MongoDB with status tracking and automatic rotation.

#### Scenario: Load keys from MongoDB

**Given** the `ohmygpt_keys` collection contains API keys
**When** the provider is initialized or reloaded
**Then** it should load all keys into memory
**And** track their status (healthy, rate_limited, exhausted, error)
**And** log the number of loaded keys

#### Scenario: Select available key using round-robin

**Given** the key pool has multiple keys
**When** a request needs to be forwarded
**Then** it should select the next healthy key
**And** advance the round-robin index
**And** skip rate-limited or exhausted keys
**And** return the key if available

#### Scenario: Handle no healthy keys available

**Given** all keys are rate_limited, exhausted, or in error
**When** a request attempts to select a key
**Then** it should return an error
**And** log that no healthy keys are available

#### Scenario: Mark key as rate limited

**Given** a key receives a 429 status code
**When** the error is processed
**Then** it should mark the key as rate_limited
**And** set cooldown for 60 seconds
**And** update the status in MongoDB asynchronously

#### Scenario: Mark key as exhausted

**Given** a key receives a 402 payment_required or budget_exceeded error
**When** the error is processed
**Then** it should mark the key as exhausted
**And** set cooldown for 24 hours
**And** update the status in MongoDB asynchronously

#### Scenario: Mark key as unauthorized

**Given** a key receives a 401 or 403 status code
**When** the error is processed
**Then** it should attempt key rotation if backup keys exist
**And** mark the key as exhausted if rotation fails
**And** update the status in MongoDB

#### Scenario: Auto-reload keys periodically

**Given** the provider is configured with auto-reload interval
**When** the interval elapses
**Then** it should reload keys from MongoDB
**And** update the in-memory key pool
**And** log the new key count

### Requirement: Request Forwarding

The system MUST forward LLM requests to OhMyGPT endpoints with proper headers and authentication.

#### Scenario: Forward chat completions request (OpenAI format)

**Given** a client sends a chat completions request
**When** the provider forwards the request
**Then** it should POST to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/chat/completions`
**And** set `Authorization: Bearer <key>` header
**And** set `x-api-key: <key>` header
**And** set `User-Agent` header from config
**And** set `Content-Type: application/json`
**And** set `Accept` header based on streaming mode
**And** set `Accept-Encoding: gzip, deflate, br`
**And** set `Accept-Language: en-US,en;q=0.9`

#### Scenario: Forward messages request (Anthropic format)

**Given** a client sends a messages request
**When** the provider forwards the request
**Then** it should POST to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
**And** set all required headers
**And** preserve the request body format

#### Scenario: Retry with next key on authentication error

**Given** a request receives 401, 402, 403, or budget_exceeded error
**When** the error is detected (non-streaming only)
**Then** it should mark the current key as having an error
**And** select the next available key
**And** retry the request up to 2 times
**And** return the response or error

#### Scenario: Return sanitized error on streaming failure

**Given** a streaming request receives 401, 402, 403, or budget_exceeded error
**When** the error is detected
**Then** it should NOT retry (to prevent double response)
**And** return a sanitized error response to the client
**And** log that retry was skipped for streaming

### Requirement: Proxy Integration

The system MUST support optional HTTP proxy pool integration with proxy-to-key bindings.

#### Scenario: Select proxy and bound key

**Given** a proxy pool is configured
**And** a binding exists between proxy and key
**When** a request is made
**Then** it should select a proxy from the pool
**And** find the corresponding bound key
**And** use the key for the request
**And** log the proxy name

#### Scenario: Fall back to direct connection on proxy failure

**Given** proxy selection fails
**When** a request is made
**Then** it should log a warning
**And** use direct connection (no proxy)
**And** select key using round-robin

#### Scenario: Round-robin through bound keys

**Given** a proxy has multiple bound keys
**When** multiple requests are made
**Then** it should rotate through the bound keys
**And** track the index per proxy

### Requirement: Response Handling

The system MUST handle both streaming and non-streaming responses from OhMyGPT.

#### Scenario: Handle streaming response (passthrough)

**Given** OhMyGPT returns a successful streaming response
**When** the response is processed
**Then** it should set `Content-Type: text/event-stream`
**And** set `Cache-Control: no-cache`
**And** forward each SSE line as-is to the client
**And** flush after each line
**And** extract usage from events (input_tokens, output_tokens)
**And** call the usage callback

#### Scenario: Handle non-streaming response (passthrough)

**Given** OhMyGPT returns a successful non-streaming response
**When** the response is processed
**Then** it should set `Content-Type: application/json`
**And** extract usage from response body
**And** forward the response body as-is
**And** call the usage callback

#### Scenario: Handle error response

**Given** OhMyGPT returns an error status
**When** the response is processed
**Then** it should sanitize the error message
**And** return the sanitized error to the client
**And** not expose upstream details

### Requirement: Usage Tracking

The system MUST track token usage and request count for each OhMyGPT API key.

#### Scenario: Update key usage after successful request

**Given** a request completes successfully
**When** usage is extracted from the response
**Then** it should increment `tokensUsed` by (input + output) tokens
**And** increment `requestsCount` by 1
**And** update `lastUsedAt` timestamp
**And** update the key document in MongoDB
**And** log the usage

#### Scenario: Skip usage update for zero tokens

**Given** a response has zero or missing token counts
**When** usage tracking runs
**Then** it should skip the database update
**And** not modify the key document

### Requirement: Database Collections

The system MUST use separate MongoDB collections for OhMyGPT keys and bindings.

#### Scenario: Store OhMyGPT keys

**Given** an OhMyGPT API key is added
**When** it is stored in MongoDB
**Then** it should use the `ohmygpt_keys` collection
**And** include fields: `apiKey`, `status`, `tokensUsed`, `requestsCount`, `lastError`, `cooldownUntil`, `createdAt`

#### Scenario: Store OhMyGPT bindings

**Given** a proxy-to-key binding is created
**When** it is stored in MongoDB
**Then** it should use the `ohmygpt_bindings` collection
**And** include fields: `proxyId`, `ohmygptKeyId`, `priority`, `isActive`, `createdAt`

#### Scenario: Create indexes for key selection

**Given** the `ohmygpt_keys` collection exists
**When** indexes are created
**Then** it should index `status` for filtering
**And** index `cooldownUntil` for cleanup queries
**And** index `createdAt` for sorting

## Related Specifications

- **openhands-provider**: Original provider that OhMyGPT mirrors. Shares the same interface patterns but with separate configuration and keys.
- **proxy-pool**: OhMyGPT integrates with the existing proxy pool system for request routing.
