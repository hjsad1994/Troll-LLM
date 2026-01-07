# Specification: OhMyGPT Request Logging

## ADDED Requirements

### Requirement: OhMyGPT OpenAI Format Request Logging
The system MUST create a request log entry for every OhMyGPT request using the OpenAI format (`/v1/chat/completions`).

#### Scenario: Successful OhMyGPT OpenAI request
**GIVEN** a user makes a valid OpenAI format request to an OhMyGPT-backed model
**WHEN** the request completes successfully
**THEN** a document is inserted into the `request_logs` collection containing:
- `userId`: The authenticated user's username
- `userKeyId`: The user's API key
- `factoryKeyId`: The OhMyGPT key ID used (from `ohmygptProvider.GetLastUsedKeyID()`)
- `model`: The requested model ID
- `inputTokens`: Number of input tokens from response
- `outputTokens`: Number of output tokens from response
- `cacheWriteTokens`: Cache write tokens (if applicable)
- `cacheHitTokens`: Cache hit tokens (if applicable)
- `creditsCost`: Billing cost calculated from tokens
- `tokensUsed`: Total tokens (input + output)
- `statusCode`: 200
- `latencyMs`: Request duration in milliseconds
- `isSuccess`: true
- `createdAt`: Current timestamp

#### Scenario: Failed OhMyGPT OpenAI request
**GIVEN** a user makes an OpenAI format request to an OhMyGPT-backed model
**WHEN** the request fails (upstream error, timeout, etc.)
**THEN** a request log entry is created with:
- `statusCode`: The actual HTTP status code (502, 504, etc.)
- `isSuccess`: false
- All other fields populated as much as possible from the partial response

#### Scenario: Streaming OhMyGPT OpenAI request
**GIVEN** a user makes a streaming OpenAI format request to OhMyGPT
**WHEN** the streaming response completes
**THEN** a single request log entry is created with final token counts from the complete response

### Requirement: OhMyGPT Anthropic Format Request Logging
The system MUST create a request log entry for every OhMyGPT request using the Anthropic format (`/v1/messages`).

#### Scenario: Successful OhMyGPT Anthropic request
**GIVEN** a user makes a valid Anthropic format request to an OhMyGPT-backed model
**WHEN** the request completes successfully
**THEN** a document is inserted into `request_logs` with the same structure as REQ-LOG-001

#### Scenario: Failed OhMyGPT Anthropic request
**GIVEN** a user makes an Anthropic format request to an OhMyGPT-backed model
**WHEN** the request fails
**THEN** a request log entry is created with failure status and available context

### Requirement: Request Log Availability
Request logs for OhMyGPT requests MUST be queryable through existing admin endpoints.

#### Scenario: Admin queries all request logs
**GIVEN** an admin user queries the request history endpoint
**WHEN** OhMyGPT requests have been made
**THEN** the response includes OhMyGPT requests alongside other upstream requests

#### Scenario: Admin filters by model
**GIVEN** an admin queries model stats endpoint
**WHEN** OhMyGPT-backed models have been used
**THEN** the model stats include OhMyGPT models with correct token counts and request counts

#### Scenario: User views their request history
**GIVEN** a user views their request history page
**WHEN** they have made OhMyGPT requests
**THEN** their request history includes OhMyGPT requests with model name, tokens, and cost

### Requirement: Performance Requirements
Request logging MUST NOT significantly impact request performance.

#### Scenario: Batched write usage
**GIVEN** OhMyGPT request logging is enabled
**WHEN** request logs are created
**THEN** they use the existing batched write system (`GetBatcher().QueueRequestLog()`)
**AND** logging does not block the response to the client

#### Scenario: High-volume OhMyGPT traffic
**GIVEN** multiple concurrent OhMyGPT requests
**WHEN** requests are processed
**THEN** request logs are successfully queued and written
**AND** no logs are lost due to channel overflow (logs may be dropped only if channel is full, with warning logged)

### Requirement: OhMyGPT Key Identification
Request logs MUST identify which OhMyGPT key was used for the request.

#### Scenario: Multiple OhMyGPT keys in rotation
**GIVEN** the system has multiple OhMyGPT keys configured
**WHEN** a request is processed using a specific OhMyGPT key
**THEN** the request log's `factoryKeyId` field contains the OhMyGPT key ID
**AND** administrators can correlate requests with specific OhMyGPT keys

#### Scenario: OhMyGPT key rotation during request
**GIVEN** an OhMyGPT key fails mid-request and is rotated
**WHEN** the request completes with a retry
**THEN** the request log contains the final (successful) OhMyGPT key ID

## MODIFIED Requirements

### Requirement: Request Log Schema Usage
The existing `RequestLog` schema MUST be used without modification to support OhMyGPT logging.

#### Scenario: OhMyGPT requests use existing schema
**GIVEN** the existing `RequestLog` schema with fields `userId`, `userKeyId`, `factoryKeyId`, `model`, `inputTokens`, `outputTokens`, etc.
**WHEN** OhMyGPT requests are logged
**THEN** the `factoryKeyId` field is populated with the OhMyGPT key ID
**AND** the `trollKeyId` field remains empty (OhMyGPT uses a different upstream mechanism)
**AND** all other fields are populated using the same logic as other upstreams
